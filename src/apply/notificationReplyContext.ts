import type { TelegramClient } from "teleproto";
import type { EntityLike } from "teleproto/define";
import { findPendingByDraftMessage } from "./pendingApplicationStore.ts";

function stripHtml(text: string): string {
  return text
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function inferTitleFromNotificationText(messageText: string): string | undefined {
  const plain = stripHtml(messageText);
  const lines = plain
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (/^🔥/.test(line) || /^новая вакансия/i.test(line)) {
      continue;
    }
    if (/^match:/i.test(line) || /^skills:/i.test(line)) {
      continue;
    }
    if (/^источник:/i.test(line)) {
      continue;
    }
    if (line.startsWith("———") || /^отклик:/i.test(line)) {
      continue;
    }
  }

  const firstContent = lines.find(
    (line) =>
      !/^🔥/.test(line) &&
      !/^новая вакансия/i.test(line) &&
      !/^match:/i.test(line) &&
      !/^отклик:/i.test(line) &&
      !line.startsWith("———"),
  );

  return firstContent === undefined || firstContent === ""
    ? undefined
    : firstContent;
}

export interface INotificationReplyContext {
  messageText: string;
  vacancyTitle?: string;
}

export async function fetchNotificationReplyContext(
  client: TelegramClient,
  chat: EntityLike,
  notificationChatId: string,
  messageId: number,
): Promise<INotificationReplyContext | undefined> {
  const messages = await client.getMessages(chat, { ids: messageId });
  const message = messages[0];
  if (message === undefined) {
    return undefined;
  }

  const raw = message.message;
  const messageText = typeof raw === "string" ? raw : "";

  const pending = await findPendingByDraftMessage(notificationChatId, messageId);
  const vacancyTitle =
    pending?.vacancyTitle?.trim() ||
    inferTitleFromNotificationText(messageText) ||
    undefined;

  return { messageText, vacancyTitle };
}
