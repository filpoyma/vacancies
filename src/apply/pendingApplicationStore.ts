import type { Types } from "mongoose";
import PendingApplication, {
  type IPendingApplicationDoc,
  type TPendingApplicationStatus,
} from "../models/PendingApplication.ts";
import type { TApplyProfileId } from "../config/types.ts";
import type { TApplyChannel } from "./types.ts";

export interface ICreatePendingApplicationInput {
  vacancyId: Types.ObjectId;
  fingerprint: string;
  channel: TApplyChannel;
  recipient: string;
  profile: TApplyProfileId;
  draftMessageId: number;
  notificationChatId: string;
  vacancyTitle?: string;
  vacancyUrl?: string;
}

export async function createPendingApplication(
  input: ICreatePendingApplicationInput,
): Promise<IPendingApplicationDoc> {
  const doc = await PendingApplication.create({
    ...input,
    status: "pending" satisfies TPendingApplicationStatus,
  });
  return doc as IPendingApplicationDoc;
}

export async function findPendingByDraftMessage(
  notificationChatId: string,
  draftMessageId: number,
): Promise<IPendingApplicationDoc | null> {
  const doc = await PendingApplication.findOne({
    notificationChatId,
    draftMessageId,
  });
  return doc as IPendingApplicationDoc | null;
}

export async function markPendingApplicationSent(
  id: Types.ObjectId,
): Promise<void> {
  await PendingApplication.updateOne(
    { _id: id },
    { status: "sent", sentAt: new Date(), $unset: { error: 1 } },
  );
}

export async function markPendingApplicationFailed(
  id: Types.ObjectId,
  errorMessage: string,
): Promise<void> {
  await PendingApplication.updateOne(
    { _id: id },
    { status: "failed", error: errorMessage.slice(0, 500) },
  );
}
