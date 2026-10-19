import { textContainsSkillTerm } from "./keywordMatch.ts";
import type { IParsedVacancy, ISalaryInfo } from "./types.ts";

const URL_PATTERN = /https?:\/\/[^\s)>]+/gi;
const TELEGRAM_LINK_PATTERN = /(?:https?:\/\/)?t\.me\/[^\s)>]+/gi;
const TELEGRAM_USERNAME_PATTERN = /@[a-zA-Z][a-zA-Z0-9_]{4,}/g;

const SKILL_ALIAS_TO_CANONICAL: Record<string, string> = {
  "react.js": "react",
  reactjs: "react",
  "react js": "react",
  rn: "react native",
  reactnative: "react native",
  "react native": "react native",
  react: "react",
  ts: "typescript",
  typescript: "typescript",
  js: "javascript",
  javascript: "javascript",
  node: "node.js",
  nodejs: "node.js",
  "node.js": "node.js",
  "node js": "node.js",
  nextjs: "next.js",
  "next.js": "next.js",
  vuejs: "vue",
  "vue.js": "vue",
  vue: "vue",
  angular: "angular",
  python: "python",
  java: "java",
  golang: "go",
  go: "go",
  rust: "rust",
  php: "php",
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  aws: "aws",
  graphql: "graphql",
  postgresql: "postgresql",
  postgres: "postgresql",
  mongodb: "mongodb",
  mongo: "mongodb",
  redis: "redis",
  figma: "figma",
  tailwind: "tailwind",
  tailwindcss: "tailwind",
};

const SKILL_SEARCH_ORDER = [
  "react native",
  "react.js",
  "reactjs",
  "react js",
  "reactnative",
  "react",
  "typescript",
  "ts",
  "javascript",
  "node.js",
  "nodejs",
  "node js",
  "node",
  "next.js",
  "nextjs",
  "vue.js",
  "vuejs",
  "vue",
  "angular",
  "python",
  "golang",
  "kubernetes",
  "postgresql",
  "postgres",
  "mongodb",
  "tailwindcss",
  "graphql",
  "docker",
  "redis",
  "figma",
  "java",
  "rust",
  "php",
  "aws",
  "go",
  "tailwind",
] as const;

export function normalizeLabel(text: string): string {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function normalizeText(text: string): string {
  return normalizeLabel(text).toLowerCase();
}

export function normalizeSkill(skill: string): string {
  const key = normalizeText(skill);
  return SKILL_ALIAS_TO_CANONICAL[key] ?? key;
}

export function normalizeSkills(skills: string[]): string[] {
  const unique = new Set(skills.map((skill) => normalizeSkill(skill)));
  return [...unique].sort();
}

export function detectSkillsFromText(text: string): string[] {
  const haystack = normalizeText(text);
  const found = new Set<string>();

  for (const term of SKILL_SEARCH_ORDER) {
    if (!textContainsSkillTerm(haystack, term)) {
      continue;
    }
    const canonical = SKILL_ALIAS_TO_CANONICAL[term];
    if (canonical !== undefined) {
      found.add(canonical);
    }
  }

  if (haystack.includes(" rn ") || haystack.startsWith("rn ")) {
    found.add("react native");
  }

  return [...found].sort();
}

export function normalizeSalary(
  salary: ISalaryInfo | undefined,
): ISalaryInfo | undefined {
  if (salary === undefined) {
    return undefined;
  }

  const next: ISalaryInfo = {};
  if (salary.min !== undefined) {
    next.min = salary.min;
  }
  if (salary.max !== undefined) {
    next.max = salary.max;
  }
  if (salary.currency !== undefined) {
    next.currency = salary.currency.trim().toUpperCase();
  }

  return next;
}

export function normalizeTelegramUsername(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("@")) {
    return `@${trimmed.slice(1).toLowerCase()}`;
  }
  return trimmed.toLowerCase();
}

export function normalizeContact(contact: string): string {
  const trimmed = contact.trim();
  if (trimmed.startsWith("@")) {
    return normalizeTelegramUsername(trimmed);
  }
  return trimmed.toLowerCase();
}

export function normalizeUrl(url: string): string {
  return url.trim();
}

/** Text core for deduplication (no links / telegram mentions). */
export function buildCoreDescription(text: string, maxWords = 80): string {
  const withoutNoise = text
    .replace(URL_PATTERN, " ")
    .replace(TELEGRAM_LINK_PATTERN, " ")
    .replace(TELEGRAM_USERNAME_PATTERN, " ");

  const normalized = normalizeText(withoutNoise);
  const words = normalized.split(/\s+/).filter((word) => word.length > 0);
  return words.slice(0, maxWords).join(" ");
}

export function normalizeParsedVacancy(vacancy: IParsedVacancy): IParsedVacancy {
  const normalized: IParsedVacancy = {
    ...vacancy,
    description: normalizeLabel(vacancy.description),
    skills: normalizeSkills(
      vacancy.skills.length > 0 ? vacancy.skills : detectSkillsFromText(vacancy.description),
    ),
  };

  if (vacancy.title !== undefined) {
    normalized.title = normalizeLabel(vacancy.title);
  }
  if (vacancy.company !== undefined) {
    normalized.company = normalizeLabel(vacancy.company);
  }
  if (vacancy.location !== undefined) {
    normalized.location = normalizeLabel(vacancy.location);
  }
  if (vacancy.salary !== undefined) {
    normalized.salary = normalizeSalary(vacancy.salary);
  }
  if (vacancy.contact !== undefined) {
    normalized.contact = normalizeContact(vacancy.contact);
  }
  if (vacancy.url !== undefined) {
    normalized.url = normalizeUrl(vacancy.url);
  }

  return normalized;
}
