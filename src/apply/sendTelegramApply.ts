import type { TelegramClient } from "teleproto";

/** Telegram captions for media are limited; cover letters are sent as a separate message. */
const RESUME_FILE_CAPTION = "Резюме";

export async function sendTelegramApply(
  client: TelegramClient,
  recipient: string,
  coverLetterText: string,
  resumeAbsolutePath: string,
): Promise<void> {
  await client.sendMessage(recipient, {
    message: coverLetterText,
    linkPreview: false,
  });

  await client.sendMessage(recipient, {
    file: resumeAbsolutePath,
    forceDocument: true,
    message: RESUME_FILE_CAPTION,
  });
}
