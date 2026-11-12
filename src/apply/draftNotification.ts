import type { TApplyProfileId } from "../config/types.ts";
import { formatProfileLabel } from "./selectProfile.ts";
import type { IApplyTarget } from "./types.ts";

export function formatApplyAutoNoticeAppend(
  target: IApplyTarget,
  profile: TApplyProfileId,
): string {
  const profileLabel = formatProfileLabel(profile);
  const recipientLabel =
    target.channel === "telegram"
      ? `Telegram ${target.recipient}`
      : `email ${target.recipient}`;

  return [
    "",
    "———",
    `Отклик: ${recipientLabel} | профиль ${profileLabel}`,
    "Профиль определён однозначно — отклик отправляется автоматически",
  ].join("\n");
}

export function formatApplyDraftAppend(
  target: IApplyTarget,
  profile: TApplyProfileId,
  confirmCommand: string,
): string {
  const profileLabel = formatProfileLabel(profile);
  const recipientLabel =
    target.channel === "telegram"
      ? `Telegram ${target.recipient}`
      : `email ${target.recipient}`;

  return [
    "",
    "———",
    `Отклик: ${recipientLabel} | профиль ${profileLabel}`,
    `Ответьте ${confirmCommand} на это сообщение, чтобы отправить CV + письмо`,
  ].join("\n");
}
