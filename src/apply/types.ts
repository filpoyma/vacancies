import type { TApplyProfileId } from "../config/types.ts";

export type TApplyChannel = "telegram" | "email";

export interface IApplyTarget {
  channel: TApplyChannel;
  recipient: string;
}

export interface IResolvedApplyAssets {
  coverLetterText: string;
  resumePathByProfile: Record<TApplyProfileId, string>;
}
