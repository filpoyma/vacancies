import type { TelegramClient } from "teleproto";
import type { EntityLike } from "teleproto/define";
import { sendVacancyNotification } from "../notifications/telegram.ts";
import type { IRawTelegramMessage } from "../telegram/types.ts";
import { createLogger, type TAppLogger } from "../utils/logger.ts";
import { upsertVacancy } from "./deduplicator.ts";
import { mightBeVacancyCandidate } from "./parser.ts";
import type { IVacancyAnalyzer } from "./types.ts";

export interface IHandleMessageDeps {
  analyzer: IVacancyAnalyzer;
  filterRoles: string[];
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
  if (!mightBeVacancyCandidate(rawMessage.rawText)) {
    log.info("Skipped: does not look like a vacancy candidate");
    return;
  }

  const analysis = await deps.analyzer.analyze(rawMessage.rawText);
  const { parsed, match: matchResult, usedAi } = analysis;

  if (!parsed.isVacancy) {
    log.info(usedAi === true ? "AI: not a vacancy" : "Not a vacancy");
    return;
  }

  log.info(usedAi === true ? "Vacancy detected (AI)" : "Vacancy detected");

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

  const matcherLog = createLogger("Matcher");
  matcherLog.info(`Score: ${matchResult.score}`);
  if (matchResult.reasons.length > 0) {
    matcherLog.info(`Reasons: ${matchResult.reasons.slice(0, 3).join("; ")}`);
  }

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
      deps.filterRoles,
    );
    notificationLog.info(`Sent to "${deps.notificationTargetTitle}"`);
  } catch (error: unknown) {
    notificationLog.error("Failed to send vacancy notification", error);
  }
}
