import type { TelegramClient } from "teleproto";
import type { IGmailEnv } from "../config/env.ts";
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
}

export async function sendApplyForVacancy(
  input: ISendApplyForVacancyInput,
): Promise<void> {
  const resumePath = input.assets.resumePathByProfile[input.profile];

  if (input.channel === "telegram") {
    await sendTelegramApply(
      input.telegramClient,
      input.recipient,
      input.assets.coverLetterText,
      resumePath,
    );
    return;
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
