import type { TTelegramDialogType } from "../config/types.ts";

export interface ITelegramSource {
  id: string;
  title: string;
  username?: string;
  type: TTelegramDialogType;
}

export interface IGetTelegramDialogsOptions {
  /** Dialog titles to omit (e.g. notification sink group). */
  excludeTitles?: string[];
}

export interface IMonitorSource {
  id: string;
  label: string;
  username?: string;
  type: TTelegramDialogType;
}

export interface IRawTelegramMessage {
  sourceId: string;
  messageId: number;
  rawText: string;
  date: Date;
  telegramMessageUrl?: string;
}

export type TRawMessageHandler = (message: IRawTelegramMessage) => void | Promise<void>;
