import type { TelegramClient } from "teleproto";
import type { EntityLike } from "teleproto/define";
import type { IApplySendEnv, IGmailEnv } from "../config/env.ts";
import { assertApplyChannelSendEnabled } from "./sendApplyForVacancy.ts";
import { createLogger } from "../utils/logger.ts";
import { extractApplyTargetFromText } from "./extractApplyTarget.ts";
import { fetchNotificationReplyContext } from "./notificationReplyContext.ts";
import type { IParsedSendToCommand } from "./parseSendToCommand.ts";
import { sendApplyForVacancy } from "./sendApplyForVacancy.ts";
import type { IResolvedApplyAssets } from "./types.ts";

const log = createLogger("Apply");

export interface ISendToCommandDeps {
  notificationChatId: string;
  notificationTarget: EntityLike;
  assets: IResolvedApplyAssets;
  telegramClient: TelegramClient;
  gmail: IGmailEnv;
  applySend: IApplySendEnv;
}

async function replyStatus(
  client: TelegramClient,
  target: EntityLike,
  replyToMsgId: number | undefined,
  text: string,
): Promise<void> {
  await client.sendMessage(target, {
    message: text,
    ...(replyToMsgId === undefined ? {} : { replyTo: replyToMsgId }),
    linkPreview: false,
  });
}

export async function handleSendToCommand(
  command: IParsedSendToCommand,
  replyToMsgId: number | undefined,
  deps: ISendToCommandDeps,
): Promise<void> {
  let recipient = command.recipient;
  let vacancyTitle: string | undefined;

  if (command.channel === "email") {
    if (replyToMsgId === undefined) {
      await replyStatus(
        deps.telegramClient,
        deps.notificationTarget,
        undefined,
        "Для /sendto email ответьте на сообщение с вакансией",
      );
      return;
    }

    const context = await fetchNotificationReplyContext(
      deps.telegramClient,
      deps.notificationTarget,
      deps.notificationChatId,
      replyToMsgId,
    );

    if (context === undefined) {
      await replyStatus(
        deps.telegramClient,
        deps.notificationTarget,
        replyToMsgId,
        "Не удалось прочитать сообщение с вакансией",
      );
      return;
    }

    const target = extractApplyTargetFromText(context.messageText);
    if (target === undefined || target.channel !== "email") {
      await replyStatus(
        deps.telegramClient,
        deps.notificationTarget,
        replyToMsgId,
        "В этом сообщении нет email для отклика",
      );
      return;
    }

    recipient = target.recipient;
    vacancyTitle = context.vacancyTitle;

    if (!deps.gmail.enabled) {
      await replyStatus(
        deps.telegramClient,
        deps.notificationTarget,
        replyToMsgId,
        "Gmail SMTP не настроен (GMAIL_APP_PASSWORD)",
      );
      return;
    }
  } else if (replyToMsgId !== undefined) {
    const context = await fetchNotificationReplyContext(
      deps.telegramClient,
      deps.notificationTarget,
      deps.notificationChatId,
      replyToMsgId,
    );
    vacancyTitle = context?.vacancyTitle;
  }

  try {
    assertApplyChannelSendEnabled(command.channel, deps.applySend);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await replyStatus(
      deps.telegramClient,
      deps.notificationTarget,
      replyToMsgId,
      message,
    );
    return;
  }

  log.info(
    `Manual sendto ${command.channel} ${recipient} (${command.profile})`,
  );

  try {
    await sendApplyForVacancy({
      channel: command.channel,
      recipient,
      profile: command.profile,
      vacancyTitle,
      assets: deps.assets,
      telegramClient: deps.telegramClient,
      gmail: deps.gmail,
      applySend: deps.applySend,
    });

    await replyStatus(
      deps.telegramClient,
      deps.notificationTarget,
      replyToMsgId,
      `Отправлено: ${recipient} (${command.profile})`,
    );
    log.info("Manual sendto completed");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Manual sendto failed", error);
    await replyStatus(
      deps.telegramClient,
      deps.notificationTarget,
      replyToMsgId,
      `Ошибка: ${message}`,
    );
  }
}
