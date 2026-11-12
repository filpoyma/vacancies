import type { IApplyTarget } from "./types.ts";

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const TELEGRAM_AT_PATTERN = /(?:^|[\s(])@([a-zA-Z][a-zA-Z0-9_]{4,31})\b/g;
const TELEGRAM_TME_PATTERN =
  /(?:https?:\/\/)?t\.me\/([a-zA-Z][a-zA-Z0-9_]{4,31})(?:[/?\s]|$)/gi;

const PRIVATE_CHANNEL_LINK = /t\.me\/c\//i;

function normalizeTelegramUsername(raw: string): string {
  const trimmed = raw.trim().replace(/^@/, "");
  return `@${trimmed}`;
}

function collectTelegramUsernames(text: string): string[] {
  const found = new Set<string>();

  for (const match of text.matchAll(TELEGRAM_AT_PATTERN)) {
    const username = match[1];
    if (username !== undefined) {
      found.add(normalizeTelegramUsername(username));
    }
  }

  for (const match of text.matchAll(TELEGRAM_TME_PATTERN)) {
    const username = match[1];
    if (username !== undefined) {
      found.add(normalizeTelegramUsername(username));
    }
  }

  return [...found];
}

function collectEmails(text: string): string[] {
  const matches = text.match(EMAIL_PATTERN);
  if (matches === null) {
    return [];
  }
  return [...new Set(matches.map((email) => email.toLowerCase()))];
}

function isEligibleVacancyText(text: string): boolean {
  if (PRIVATE_CHANNEL_LINK.test(text)) {
    // still allow @contacts inside text; only skip t.me/c links as recipients
  }
  return true;
}

export function extractApplyTargetFromText(text: string): IApplyTarget | undefined {
  if (!isEligibleVacancyText(text)) {
    return undefined;
  }

  const telegramUsers = collectTelegramUsernames(text);
  if (telegramUsers.length > 0) {
    return { channel: "telegram", recipient: telegramUsers[0] };
  }

  const emails = collectEmails(text);
  if (emails.length > 0) {
    return { channel: "email", recipient: emails[0] };
  }

  return undefined;
}

export function extractApplyTarget(
  vacancyText: string,
  parsedContact?: string,
  parsedUrl?: string,
): IApplyTarget | undefined {
  const parts = [vacancyText];
  if (parsedContact !== undefined && parsedContact.trim() !== "") {
    parts.push(parsedContact);
  }
  if (parsedUrl !== undefined && parsedUrl.trim() !== "" && !PRIVATE_CHANNEL_LINK.test(parsedUrl)) {
    parts.push(parsedUrl);
  }

  return extractApplyTargetFromText(parts.join("\n"));
}
