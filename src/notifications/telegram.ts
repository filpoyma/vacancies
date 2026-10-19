import type { TelegramClient } from "teleproto";
import type { EntityLike } from "teleproto/define";
import { getTelegramDialogs } from "../telegram/dialogs.ts";
import type { IMatchResult, IParsedVacancy } from "../vacancy/types.ts";
import { createLogger } from "../utils/logger.ts";

const log = createLogger("Notification");

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatSalaryLine(parsed: IParsedVacancy): string | undefined {
  if (parsed.salary?.min === undefined) {
    return undefined;
  }

  const currency = parsed.salary.currency ?? "";
  const min = parsed.salary.min.toLocaleString("en-US");
  if (parsed.salary.max !== undefined) {
    const max = parsed.salary.max.toLocaleString("en-US");
    if (currency === "USD") {
      return `$${min}–${max}`;
    }
    return `${min}–${max} ${currency}`.trim();
  }

  if (currency === "USD") {
    return `$${min}`;
  }
  return `${min} ${currency}`.trim();
}

export function formatVacancyNotificationMessage(
  parsed: IParsedVacancy,
  match: IMatchResult,
  sourceTitle: string,
  vacancyUrl?: string,
): string {
  const title = escapeHtml(parsed.title ?? "Vacancy");
  const lines: string[] = [
    "🔥 <b>НОВАЯ ВАКАНСИЯ</b>",
    "",
    title,
    "",
  ];

  const salaryLine = formatSalaryLine(parsed);
  if (salaryLine !== undefined) {
    lines.push(`💰 ${escapeHtml(salaryLine)}`);
  }

  if (parsed.remote === true) {
    lines.push("🌎 Remote");
  } else if (parsed.location !== undefined) {
    lines.push(`📍 ${escapeHtml(parsed.location)}`);
  }

  lines.push(`🎯 Match: ${match.score}%`, "");

  if (match.reasons.length > 0) {
    const summary = match.reasons.slice(0, 2).map((reason) => escapeHtml(reason));
    lines.push(`💡 ${summary.join(" · ")}`, "");
  }

  if (parsed.skills.length > 0) {
    lines.push("Skills:", escapeHtml(parsed.skills.join(", ")), "");
  }

  lines.push("Источник:", escapeHtml(sourceTitle), "");

  if (vacancyUrl !== undefined && vacancyUrl.trim() !== "") {
    const safeUrl = escapeHtml(vacancyUrl.trim());
    lines.push(`<a href="${safeUrl}">🔗 Open vacancy</a>`);
  }

  return lines.join("\n");
}

export async function resolveNotificationTarget(
  client: TelegramClient,
  targetTitle: string,
): Promise<EntityLike> {
  const dialogs = await getTelegramDialogs(client);
  const normalizedTarget = normalizeTitle(targetTitle);

  const existing = dialogs.find(
    (dialog) => normalizeTitle(dialog.title) === normalizedTarget,
  );
  if (existing !== undefined) {
    log.info(`Using notification group "${existing.title}"`);
    return existing.id;
  }

  log.info(`Creating notification group "${targetTitle}"`);
  const channel = await client.createChannel({
    title: targetTitle,
    megagroup: true,
  });

  const createdId = await client.getPeerId(channel, true);
  log.info(`Notification group created (${createdId})`);
  return createdId;
}

export async function sendVacancyNotification(
  client: TelegramClient,
  target: EntityLike,
  parsed: IParsedVacancy,
  match: IMatchResult,
  sourceTitle: string,
  vacancyUrl?: string,
): Promise<void> {
  const message = formatVacancyNotificationMessage(
    parsed,
    match,
    sourceTitle,
    vacancyUrl,
  );

  await client.sendMessage(target, {
    message,
    parseMode: "html",
    linkPreview: false,
  });
}
