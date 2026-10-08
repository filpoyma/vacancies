import type { TelegramClient } from "teleproto";
import type { EntityLike } from "teleproto/define";
import { sendVacancyNotification } from "../notifications/telegram.ts";
import type { IRawTelegramMessage } from "../telegram/types.ts";
import { createLogger, type TAppLogger } from "../utils/logger.ts";
import { upsertVacancy } from "./deduplicator.ts";
import type { IVacancyMatcher } from "./types.ts";
import { parseVacancy } from "./parser.ts";

export interface IHandleMessageDeps {
  matcher: IVacancyMatcher;
  telegramClient: TelegramClient;
  notificationTargetId: EntityLike;
  notificationTargetTitle: string;
  getSourceLabel(sourceId: string): string;
}

export async function handleRawMessage(
  rawMessage: IRawTelegramMessage,
  log: TAppLogger,
  deps: IHandleMessageDeps,
): Promise<void> {
  const parsed = parseVacancy(rawMessage.rawText);

  if (!parsed.isVacancy) {
    log.info("Not a vacancy");
    return;
  }

  log.info("Vacancy detected");

  const title = parsed.title ?? "Untitled";
  const skills =
    parsed.skills.length > 0 ? parsed.skills.join(", ") : "n/a";
  log.info(`Title: ${title}`);
  log.info(`Skills: ${skills}`);

  if (parsed.salary?.min !== undefined) {
    const maxPart =
      parsed.salary.max !== undefined ? `–${parsed.salary.max}` : "";
    const currency = parsed.salary.currency ?? "";
    log.info(`Salary: ${parsed.salary.min}${maxPart} ${currency}`.trim());
  }

  const matchResult = await deps.matcher.match(parsed);
  const matcherLog = createLogger("Matcher");
  matcherLog.info(`Score: ${matchResult.score}`);

  const dbLog = createLogger("Database");
  const { vacancy, isNew } = await upsertVacancy(parsed, rawMessage);

  vacancy.matchScore = matchResult.score;
  vacancy.isRelevant = matchResult.isRelevant;
  await vacancy.save();

  if (isNew) {
    dbLog.info("Vacancy created");
  } else {
    dbLog.info("Vacancy duplicate merged");
  }

  if (!isNew || !matchResult.isRelevant) {
    return;
  }

  const notificationLog = createLogger("Notification");
  const sourceTitle = deps.getSourceLabel(rawMessage.sourceId);
  const vacancyUrl = parsed.url ?? rawMessage.telegramMessageUrl;

  try {
    await sendVacancyNotification(
      deps.telegramClient,
      deps.notificationTargetId,
      parsed,
      matchResult,
      sourceTitle,
      vacancyUrl,
    );
    notificationLog.info(`Sent to "${deps.notificationTargetTitle}"`);
  } catch (error: unknown) {
    notificationLog.error("Failed to send vacancy notification", error);
  }
}
