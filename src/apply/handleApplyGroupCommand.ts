import { handleConfirmCommandMessage, type IConfirmCommandDeps } from "./handleConfirmCommand.ts";
import { handleSendToCommand } from "./handleSendToCommand.ts";
import { parseSendToCommand } from "./parseSendToCommand.ts";

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

  await handleConfirmCommandMessage(messageText, replyToMsgId, deps);
}
