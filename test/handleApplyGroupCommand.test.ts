import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleApplyGroupCommand } from "../src/apply/handleApplyGroupCommand.ts";
import type { IConfirmCommandDeps } from "../src/apply/handleConfirmCommand.ts";

describe("handleApplyGroupCommand", () => {
  it("replies with usage for invalid /sendto", async () => {
    const sentMessages: string[] = [];
    const deps: IConfirmCommandDeps = {
      confirmCommand: "/send",
      sendToCommand: "/sendto",
      notificationChatId: "-1001",
      notificationTarget: "-1001",
      assets: {
        coverLetterText: "letter",
        resumePathByProfile: {
          frontend: "/tmp/fe.pdf",
          fullstack: "/tmp/fs.pdf",
        },
      },
      telegramClient: {
        sendMessage: async (
          _target: unknown,
          params: { message: string },
        ) => {
          sentMessages.push(params.message);
        },
      } as never,
      gmail: { user: "x@y.z", appPassword: undefined, enabled: false },
      applySend: { telegramSendEnabled: true, emailSendEnabled: true },
    };

    await handleApplyGroupCommand("/sendto not-an-email frontend", 10, deps);

    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0] ?? "", /Не понял команду/);
    assert.match(sentMessages[0] ?? "", /\/sendto/);
  });
});
