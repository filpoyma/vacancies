import type { TelegramClient } from "teleproto";
import type { EntityLike } from "teleproto/define";
import type { IGmailEnv } from "../config/env.ts";
import { createLogger } from "../utils/logger.ts";
import { executePendingApplication } from "./executePendingApplication.ts";
import { findPendingByDraftMessage } from "./pendingApplicationStore.ts";
import type { IPendingApplicationDoc } from "../models/PendingApplication.ts";
import type { IResolvedApplyAssets } from "./types.ts";

const log = createLogger("Apply");

export interface IConfirmCommandDeps {
  confirmCommand: string;
  notificationChatId: string;
  notificationTarget: EntityLike;
  assets: IResolvedApplyAssets;
  telegramClient: TelegramClient;
  gmail: IGmailEnv;
}

export interface IConfirmCommandServices {
  findPendingByDraftMessage: typeof findPendingByDraftMessage;
  executePendingApplication: typeof executePendingApplication;
}

const defaultServices: IConfirmCommandServices = {
  findPendingByDraftMessage,
  executePendingApplication,
};

function normalizeCommandText(text: string): string {
  return text.trim().split(/\s+/)[0] ?? "";
}

function isConfirmCommand(text: string, confirmCommand: string): boolean {
  const token = normalizeCommandText(text);
  return token.toLowerCase() === confirmCommand.toLowerCase();
}

function resolveReplyToMessageId(message: {
  replyTo?: { replyToMsgId?: number };
}): number | undefined {
  const replyToMsgId = message.replyTo?.replyToMsgId;
  return typeof replyToMsgId === "number" ? replyToMsgId : undefined;
}

async function replyStatus(
  client: TelegramClient,
  target: EntityLike,
  replyToMsgId: number,
  text: string,
): Promise<void> {
  await client.sendMessage(target, {
    message: text,
    replyTo: replyToMsgId,
    linkPreview: false,
  });
}

export async function handleConfirmCommandMessage(
  messageText: string,
  replyToMsgId: number | undefined,
  deps: IConfirmCommandDeps,
  services: IConfirmCommandServices = defaultServices,
): Promise<void> {
  if (!isConfirmCommand(messageText, deps.confirmCommand)) {
    return;
  }

  if (replyToMsgId === undefined) {
    return;
  }

  const pending = await services.findPendingByDraftMessage(
    deps.notificationChatId,
    replyToMsgId,
  );

  if (pending === null) {
    return;
  }

  if (pending.status === "sent") {
    await replyStatus(
      deps.telegramClient,
      deps.notificationTarget,
      replyToMsgId,
      "Уже отправлено",
    );
    return;
  }

  if (pending.status === "failed") {
    await replyStatus(
      deps.telegramClient,
      deps.notificationTarget,
      replyToMsgId,
      `Ранее ошибка: ${pending.error ?? "unknown"}. Повторяю отправку…`,
    );
  }

  log.info(
    `Applying to ${pending.channel} ${pending.recipient} (${pending.profile})`,
  );

  try {
    await services.executePendingApplication(
      pending as IPendingApplicationDoc,
      deps.assets,
      deps.telegramClient,
      deps.gmail,
    );

    const channelLabel =
      pending.channel === "telegram"
        ? pending.recipient
        : pending.recipient;

    await replyStatus(
      deps.telegramClient,
      deps.notificationTarget,
      replyToMsgId,
      `Отправлено: ${channelLabel}`,
    );
    log.info("Application sent");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Application failed", error);
    await replyStatus(
      deps.telegramClient,
      deps.notificationTarget,
      replyToMsgId,
      `Ошибка: ${message}`,
    );
  }
}
