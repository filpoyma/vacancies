import { createLogger } from "../utils/logger.ts";
import { handleConfirmCommandMessage, type IConfirmCommandDeps } from "./handleConfirmCommand.ts";
import { handleSendToCommand } from "./handleSendToCommand.ts";
import {
  looksLikeSendToCommand,
  parseSendToCommand,
  SEND_TO_USAGE,
} from "./parseSendToCommand.ts";

const log = createLogger("Apply");

export async function handleApplyGroupCommand(
  messageText: string,
  replyToMsgId: number | undefined,
  deps: IConfirmCommandDeps,
): Promise<void> {
  const sendTo = parseSendToCommand(messageText, deps.sendToCommand);
  if (sendTo !== undefined) {
    await handleSendToCommand(sendTo, replyToMsgId, deps);
    return;
  }

  if (looksLikeSendToCommand(messageText, deps.sendToCommand)) {
    log.warn(`Invalid /sendto command: ${messageText}`);
    await deps.telegramClient.sendMessage(deps.notificationTarget, {
      message: `Не понял команду.\n${SEND_TO_USAGE}`,
      ...(replyToMsgId === undefined ? {} : { replyTo: replyToMsgId }),
      linkPreview: false,
    });
    return;
  }

  await handleConfirmCommandMessage(messageText, replyToMsgId, deps);
}
