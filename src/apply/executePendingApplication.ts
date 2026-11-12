import type { TelegramClient } from "teleproto";
import type { IApplySendEnv, IGmailEnv } from "../config/env.ts";
import type { IPendingApplicationDoc } from "../models/PendingApplication.ts";
import {
  markPendingApplicationFailed,
  markPendingApplicationSent,
} from "./pendingApplicationStore.ts";
import { sendApplyForVacancy } from "./sendApplyForVacancy.ts";
import type { IResolvedApplyAssets } from "./types.ts";

export async function executePendingApplication(
  pending: IPendingApplicationDoc,
  assets: IResolvedApplyAssets,
  telegramClient: TelegramClient,
  gmail: IGmailEnv,
  applySend: IApplySendEnv,
): Promise<void> {
  try {
    await sendApplyForVacancy({
      channel: pending.channel,
      recipient: pending.recipient,
      profile: pending.profile,
      vacancyTitle: pending.vacancyTitle ?? undefined,
      assets,
      telegramClient,
      gmail,
      applySend,
    });

    await markPendingApplicationSent(pending._id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await markPendingApplicationFailed(pending._id, message);
    throw error;
  }
}
