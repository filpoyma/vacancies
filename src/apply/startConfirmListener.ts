import { NewMessage } from "teleproto/events";
import type { NewMessageEvent } from "teleproto/events";
import type { TelegramClient } from "teleproto";
import type { EntityLike } from "teleproto/define";
import type { Unsubscribe } from "teleproto/client/updates/composer";
import { createLogger } from "../utils/logger.ts";
import { handleApplyGroupCommand } from "./handleApplyGroupCommand.ts";
import type { IConfirmCommandDeps } from "./handleConfirmCommand.ts";

const log = createLogger("Apply");

function extractMessageText(message: NewMessageEvent["message"]): string {
  const text = message.message;
  return typeof text === "string" ? text : "";
}

export function startApplyConfirmListener(
  client: TelegramClient,
  notificationTarget: EntityLike,
  deps: IConfirmCommandDeps,
  options: { isActive?: () => boolean } = {},
): Unsubscribe {
  const chats = [notificationTarget];

  const unsubscribe = client.updates.on(
    new NewMessage({ chats, incoming: true, outgoing: true }),
    async (event: NewMessageEvent) => {
      if (options.isActive !== undefined && !options.isActive()) {
        return;
      }

      const text = extractMessageText(event.message).trim();
      if (text === "") {
        return;
      }

      const replyToMsgId = event.message.replyTo?.replyToMsgId;
      const replyId =
        typeof replyToMsgId === "number" ? replyToMsgId : undefined;

      try {
        await handleApplyGroupCommand(text, replyId, deps);
      } catch (error: unknown) {
        log.error("Confirm handler error", error);
      }
    },
  );

  log.info("Apply confirm listener running");
  return unsubscribe;
}
