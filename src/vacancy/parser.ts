import { detectSkillsFromText, normalizeParsedVacancy } from "./normalizer.ts";
import type { IParsedVacancy, ISalaryInfo } from "./types.ts";

const VACANCY_SIGNAL_PATTERNS: RegExp[] = [
  /\bvacancy\b/i,
  /\bhiring\b/i,
  /\bwe\s+are\s+hiring\b/i,
  /\blooking\s+for\b/i,
  /\bjob\s+opening\b/i,
  /\bopen\s+position\b/i,
  /ищем/i,
  /вакансия/i,
  /требуется/i,
  /нужен/i,
  /нужна/i,
  /нужны/i,
  /на\s+позицию/i,
  /разработчик/i,
  /\bdeveloper\b/i,
  /\bengineer\b/i,
];

const REMOTE_PATTERNS: RegExp[] = [
  /\bremote\b/i,
  /удал[её]н/i,
  /удаленка/i,
  /\bwork\s+from\s+home\b/i,
  /\bwfh\b/i,
];

const OFFICE_ONLY_PATTERNS: RegExp[] = [
  /\boffice\s+only\b/i,
  /только\s+офис/i,
  /в\s+офисе/i,
];

const EXPERIENCE_PATTERN =
  /(?:^|[\s(,])(\d{1,2})\s*\+?\s*(?:years?|yrs?|лет|года?|г\.)/i;

const EXPERIENCE_FROM_PATTERN = /опыт\s+от\s+(\d{1,2})\s*(?:лет|года?)/i;

const URL_PATTERN = /https?:\/\/[^\s)>]+/i;
const TELEGRAM_LINK_PATTERN = /(?:https?:\/\/)?t\.me\/[^\s)>]+/i;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const TELEGRAM_CONTACT_PATTERN = /@[a-zA-Z][a-zA-Z0-9_]{4,}/;

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function hasVacancySignal(text: string): boolean {
  return VACANCY_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}

function extractSalary(text: string): ISalaryInfo | undefined {
  const usdRange =
    /\$\s*([\d][\d,]*)\s*(?:-|–|—|to)\s*\$?\s*([\d][\d,]*)/i.exec(text) ??
    /([\d][\d,]*)\s*(?:-|–|—|to)\s*([\d][\d,]*)\s*(usd|\$)/i.exec(text);

  if (usdRange !== null) {
    const min = Number.parseInt(usdRange[1].replace(/,/g, ""), 10);
    const max = Number.parseInt(usdRange[2].replace(/,/g, ""), 10);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min, max, currency: "USD" };
    }
  }

  const singleUsd = /\$\s*([\d][\d,]*)/i.exec(text);
  if (singleUsd !== null) {
    const min = Number.parseInt(singleUsd[1].replace(/,/g, ""), 10);
    if (Number.isFinite(min)) {
      return { min, currency: "USD" };
    }
  }

  const rubFrom = /от\s+([\d\s]+)\s*(?:₽|руб\.?|rub)/i.exec(text);
  if (rubFrom !== null) {
    const min = Number.parseInt(rubFrom[1].replace(/\s/g, ""), 10);
    if (Number.isFinite(min)) {
      return { min, currency: "RUB" };
    }
  }

  const eurRange =
    /([\d][\d,]*)\s*(?:-|–|—)\s*([\d][\d,]*)\s*(?:€|eur)/i.exec(text);
  if (eurRange !== null) {
    const min = Number.parseInt(eurRange[1].replace(/,/g, ""), 10);
    const max = Number.parseInt(eurRange[2].replace(/,/g, ""), 10);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min, max, currency: "EUR" };
    }
  }

  return undefined;
}

function extractExperienceYears(text: string): number | undefined {
  const fromMatch = EXPERIENCE_FROM_PATTERN.exec(text);
  if (fromMatch !== null) {
    const years = Number.parseInt(fromMatch[1], 10);
    if (Number.isFinite(years)) {
      return years;
    }
  }

  const match = EXPERIENCE_PATTERN.exec(text);
  if (match === null) {
    return undefined;
  }
  const years = Number.parseInt(match[1], 10);
  return Number.isFinite(years) ? years : undefined;
}

function extractUrl(text: string): string | undefined {
  const http = URL_PATTERN.exec(text);
  if (http !== null) {
    return http[0];
  }
  const telegram = TELEGRAM_LINK_PATTERN.exec(text);
  return telegram?.[0];
}

function extractContact(text: string): string | undefined {
  const email = EMAIL_PATTERN.exec(text);
  if (email !== null) {
    return email[0];
  }
  const telegram = TELEGRAM_CONTACT_PATTERN.exec(text);
  return telegram?.[0];
}

function extractCompany(text: string): string | undefined {
  const labeled =
    /(?:company|компания|employer|работодатель)\s*:\s*(.+)/i.exec(text);
  if (labeled !== null) {
    return labeled[1].split("\n")[0]?.trim();
  }
  return undefined;
}

function extractTitle(text: string): string | undefined {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines.slice(0, 5)) {
    if (line.length < 4 || line.length > 120) {
      continue;
    }
    if (/^#/.test(line)) {
      return line.replace(/^#+\s*/, "").trim();
    }
    if (
      /(developer|engineer|разработчик|вакансия|position|specialist)/i.test(
        line,
      )
    ) {
      return line;
    }
  }

  return lines[0];
}

function extractLocation(text: string): string | undefined {
  const labeled = /(?:location|локация|город)\s*:\s*(.+)/i.exec(text);
  if (labeled !== null) {
    return labeled[1].split("\n")[0]?.trim();
  }
  return undefined;
}

function detectRemote(text: string): boolean | undefined {
  if (REMOTE_PATTERNS.some((pattern) => pattern.test(text))) {
    return true;
  }
  if (OFFICE_ONLY_PATTERNS.some((pattern) => pattern.test(text))) {
    return false;
  }
  return undefined;
}

function looksLikeVacancy(text: string, salary?: ISalaryInfo, skills: string[] = []): boolean {
  if (hasVacancySignal(text)) {
    return true;
  }
  if (salary !== undefined && skills.length >= 2) {
    return true;
  }
  return false;
}

export function parseVacancy(rawText: string): IParsedVacancy {
  const description = normalizeWhitespace(rawText);
  const salary = extractSalary(description);
  const skills = detectSkillsFromText(description);
  const isVacancy = looksLikeVacancy(description, salary, skills);

  const parsed: IParsedVacancy = {
    isVacancy,
    description,
    skills,
  };

  const title = extractTitle(description);
  if (title !== undefined) {
    parsed.title = title;
  }

  const company = extractCompany(description);
  if (company !== undefined) {
    parsed.company = company;
  }

  if (salary !== undefined) {
    parsed.salary = salary;
  }

  const location = extractLocation(description);
  if (location !== undefined) {
    parsed.location = location;
  }

  const remote = detectRemote(description);
  if (remote !== undefined) {
    parsed.remote = remote;
  }

  const experience = extractExperienceYears(description);
  if (experience !== undefined) {
    parsed.experience = experience;
  }

  const contact = extractContact(description);
  if (contact !== undefined) {
    parsed.contact = contact;
  }

  const url = extractUrl(description);
  if (url !== undefined) {
    parsed.url = url;
  }

  return normalizeParsedVacancy(parsed);
}
