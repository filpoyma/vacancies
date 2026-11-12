import type { TApplyProfileId } from "../config/types.ts";

export interface IParsedSendToCommand {
  channel: "telegram" | "email";
  /** Telegram @username or placeholder for email mode (filled from vacancy text). */
  recipient: string;
  profile: TApplyProfileId;
}

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

  if (target.startsWith("@") || /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(target)) {
    return {
      channel: "telegram",
      recipient: normalizeTelegramRecipient(target),
      profile,
    };
  }

  return undefined;
}
