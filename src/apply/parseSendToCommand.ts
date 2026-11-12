import type { TApplyProfileId } from "../config/types.ts";

export interface IParsedSendToCommand {
  channel: "telegram" | "email";
  /**
   * Telegram @username, explicit email address, or empty string for
   * `/sendto email …` mode (recipient filled from vacancy text).
   */
  recipient: string;
  profile: TApplyProfileId;
}

const EMAIL_ARG_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const TELEGRAM_USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export const SEND_TO_USAGE =
  "Формат: /sendto @user frontend|fullstack · /sendto email@host frontend|fullstack · /sendto email frontend|fullstack";

function parseProfile(raw: string | undefined): TApplyProfileId | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const normalized = raw.toLowerCase();
  if (normalized === "frontend" || normalized === "fullstack") {
    return normalized;
  }
  return undefined;
}

function normalizeTelegramRecipient(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("@")) {
    return trimmed;
  }
  return `@${trimmed}`;
}

export function looksLikeSendToCommand(
  text: string,
  sendToCommand = "/sendto",
): boolean {
  const token = text.trim().split(/\s+/)[0] ?? "";
  return token.toLowerCase() === sendToCommand.toLowerCase();
}

export function parseSendToCommand(
  text: string,
  sendToCommand = "/sendto",
): IParsedSendToCommand | undefined {
  const trimmed = text.trim();
  const commandPrefix = sendToCommand.toLowerCase();
  if (!trimmed.toLowerCase().startsWith(commandPrefix)) {
    return undefined;
  }

  const args = trimmed.slice(sendToCommand.length).trim().split(/\s+/);
  if (args.length < 2) {
    return undefined;
  }

  const profile = parseProfile(args[1]);
  if (profile === undefined) {
    return undefined;
  }

  const target = args[0];
  if (target.toLowerCase() === "email") {
    return {
      channel: "email",
      recipient: "",
      profile,
    };
  }

  if (EMAIL_ARG_PATTERN.test(target)) {
    return {
      channel: "email",
      recipient: target.toLowerCase(),
      profile,
    };
  }

  if (target.startsWith("@") || TELEGRAM_USERNAME_PATTERN.test(target)) {
    return {
      channel: "telegram",
      recipient: normalizeTelegramRecipient(target),
      profile,
    };
  }

  return undefined;
}
