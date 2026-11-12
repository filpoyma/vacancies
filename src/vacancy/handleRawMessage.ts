import type { TelegramClient } from "teleproto";
import type { EntityLike } from "teleproto/define";
import {
  formatApplyAutoNoticeAppend,
  formatApplyDraftAppend,
} from "../apply/draftNotification.ts";
import { extractApplyTarget } from "../apply/extractApplyTarget.ts";
import { createPendingApplication } from "../apply/pendingApplicationStore.ts";
import {
  resolveApplyProfile,
  type IApplyProfileDecision,
} from "../apply/selectProfile.ts";
import { sendApplyForVacancy } from "../apply/sendApplyForVacancy.ts";
import type { IApplyTarget, IResolvedApplyAssets } from "../apply/types.ts";
import type { IApplyConfig } from "../config/types.ts";
import type { IApplySendEnv, IGmailEnv } from "../config/env.ts";
import { sendVacancyNotification } from "../notifications/telegram.ts";
import type { IRawTelegramMessage } from "../telegram/types.ts";
import { createLogger, type TAppLogger } from "../utils/logger.ts";
import { upsertVacancy } from "./deduplicator.ts";
import { mightBeVacancyCandidate } from "./parser.ts";
import type { IVacancyAnalyzer } from "./types.ts";

export interface IHandleMessageDeps {
  analyzer: IVacancyAnalyzer;
  filterRoles: string[];
  applyConfig: IApplyConfig;
  applyAssets?: IResolvedApplyAssets;
  gmail: IGmailEnv;
  applySend: IApplySendEnv;
  notificationChatId: string;
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
  const applyLog = createLogger("Apply");
  const sourceTitle = deps.getSourceLabel(rawMessage.sourceId);
  const vacancyUrl = parsed.url ?? rawMessage.telegramMessageUrl;

  let messageAppend: string | undefined;
  let applyTarget: IApplyTarget | undefined;
  let profileDecision: IApplyProfileDecision | undefined;

  if (deps.applyConfig.enabled && deps.applyAssets !== undefined) {
    applyTarget = extractApplyTarget(
      rawMessage.rawText,
      parsed.contact,
      parsed.url,
    );

    if (applyTarget !== undefined) {
      if (
        applyTarget.channel === "telegram" &&
        !deps.applySend.telegramSendEnabled
      ) {
        applyLog.warn(
          "Telegram apply skipped: TELEGRAM_SEND_ENABLE=false",
        );
        applyTarget = undefined;
      } else if (applyTarget.channel === "email" && !deps.applySend.emailSendEnabled) {
        applyLog.warn("Email apply skipped: EMAIL_SEND_ENABLE=false");
        applyTarget = undefined;
      } else if (applyTarget.channel === "email" && !deps.gmail.enabled) {
        applyLog.warn(
          `Vacancy has email contact ${applyTarget.recipient}, but Gmail SMTP is not configured — skipping apply`,
        );
        applyTarget = undefined;
      } else {
        profileDecision = resolveApplyProfile(parsed.title, parsed.description);
        messageAppend =
          profileDecision.confidence === "certain"
            ? formatApplyAutoNoticeAppend(
                applyTarget,
                profileDecision.profile,
              )
            : formatApplyDraftAppend(
                applyTarget,
                profileDecision.profile,
                deps.applyConfig.confirmCommand,
              );
      }
    }
  }

  try {
    const { messageId } = await sendVacancyNotification(
      deps.telegramClient,
      deps.notificationTargetId,
      parsed,
      matchResult,
      sourceTitle,
      vacancyUrl,
      deps.filterRoles,
      messageAppend,
    );
    notificationLog.info(`Sent to "${deps.notificationTargetTitle}"`);

    if (
      applyTarget === undefined ||
      deps.applyAssets === undefined ||
      profileDecision === undefined
    ) {
      return;
    }

    const registerPendingForConfirm = async (): Promise<void> => {
      await createPendingApplication({
        vacancyId: vacancy._id,
        fingerprint: vacancy.fingerprint,
        channel: applyTarget.channel,
        recipient: applyTarget.recipient,
        profile: profileDecision.profile,
        draftMessageId: messageId,
        notificationChatId: deps.notificationChatId,
        vacancyTitle: parsed.title,
        vacancyUrl,
      });
      applyLog.info(`Apply draft registered (message ${messageId})`);
    };

    if (profileDecision.confidence === "ambiguous") {
      await registerPendingForConfirm();
      return;
    }

    try {
      await sendApplyForVacancy({
        channel: applyTarget.channel,
        recipient: applyTarget.recipient,
        profile: profileDecision.profile,
        vacancyTitle: parsed.title,
        assets: deps.applyAssets,
        telegramClient: deps.telegramClient,
        gmail: deps.gmail,
        applySend: deps.applySend,
      });

      await deps.telegramClient.sendMessage(deps.notificationTargetId, {
        message: `Автоотклик: отправлено ${applyTarget.recipient}`,
        replyTo: messageId,
        linkPreview: false,
      });
      applyLog.info(`Auto-apply sent to ${applyTarget.recipient}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      applyLog.error("Auto-apply failed, falling back to /send confirm", error);
      await registerPendingForConfirm();
      await deps.telegramClient.sendMessage(deps.notificationTargetId, {
        message: `Автоотклик не удался: ${message}\nОтветьте ${deps.applyConfig.confirmCommand} на это сообщение для повторной отправки.`,
        replyTo: messageId,
        linkPreview: false,
      });
    }
  } catch (error: unknown) {
    notificationLog.error("Failed to send vacancy notification", error);
  }
}
