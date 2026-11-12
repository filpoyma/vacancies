import type { TelegramClient } from "teleproto";
import type { IApplySendEnv, IGmailEnv } from "../config/env.ts";
import type { TApplyProfileId } from "../config/types.ts";
import { sendEmailApply } from "./sendEmailApply.ts";
import { sendTelegramApply } from "./sendTelegramApply.ts";
import type { IResolvedApplyAssets, TApplyChannel } from "./types.ts";

export interface ISendApplyForVacancyInput {
  channel: TApplyChannel;
  recipient: string;
  profile: TApplyProfileId;
  vacancyTitle?: string;
  assets: IResolvedApplyAssets;
  telegramClient: TelegramClient;
  gmail: IGmailEnv;
  applySend: IApplySendEnv;
}

export function assertApplyChannelSendEnabled(
  channel: TApplyChannel,
  applySend: IApplySendEnv,
): void {
  if (channel === "telegram" && !applySend.telegramSendEnabled) {
    throw new Error(
      "Отправка в Telegram отключена (TELEGRAM_SEND_ENABLE=false)",
    );
  }
  if (channel === "email" && !applySend.emailSendEnabled) {
    throw new Error("Отправка на email отключена (EMAIL_SEND_ENABLE=false)");
  }
}

export async function sendApplyForVacancy(
  input: ISendApplyForVacancyInput,
): Promise<void> {
  assertApplyChannelSendEnabled(input.channel, input.applySend);

  const resumePath = input.assets.resumePathByProfile[input.profile];

  if (input.channel === "telegram") {
    await sendTelegramApply(
      input.telegramClient,
      input.recipient,
      input.assets.coverLetterText,
      resumePath,
      input.vacancyTitle,
    );
    return;
  }

  if (!input.gmail.enabled) {
    throw new Error("Gmail SMTP is not configured (GMAIL_APP_PASSWORD).");
  }

  const subject = input.vacancyTitle?.trim() ?? "Vacancy application";
  await sendEmailApply(
    input.gmail,
    input.recipient,
    subject,
    input.assets.coverLetterText,
    resumePath,
  );
}
