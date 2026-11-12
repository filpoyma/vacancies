import type { TelegramClient } from "teleproto";

/** Telegram media captions are limited to 1024 characters. */
const TELEGRAM_CAPTION_MAX = 1024;
const RESUME_FILE_CAPTION = "Резюме";

export function formatTelegramApplyMessage(
  coverLetterText: string,
  vacancyTitle?: string,
): string {
  const title = vacancyTitle?.trim();
  if (title === undefined || title === "") {
    return coverLetterText;
  }
  return `Вакансия: ${title}\n\n${coverLetterText}`;
}

export function formatTelegramResumeCaption(vacancyTitle?: string): string {
  const title = vacancyTitle?.trim();
  if (title === undefined || title === "") {
    return RESUME_FILE_CAPTION;
  }
  const caption = `${RESUME_FILE_CAPTION} — ${title}`;
  if (caption.length <= TELEGRAM_CAPTION_MAX) {
    return caption;
  }
  return `${caption.slice(0, TELEGRAM_CAPTION_MAX - 3)}...`;
}

export async function sendTelegramApply(
  client: TelegramClient,
  recipient: string,
  coverLetterText: string,
  resumeAbsolutePath: string,
  vacancyTitle?: string,
): Promise<void> {
  const message = formatTelegramApplyMessage(coverLetterText, vacancyTitle);

  await client.sendMessage(recipient, {
    message,
    linkPreview: false,
  });

  await client.sendMessage(recipient, {
    file: resumeAbsolutePath,
    forceDocument: true,
    message: formatTelegramResumeCaption(vacancyTitle),
  });
}
