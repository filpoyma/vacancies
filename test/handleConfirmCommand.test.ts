import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Types } from "mongoose";
import {
  handleConfirmCommandMessage,
  type IConfirmCommandServices,
} from "../src/apply/handleConfirmCommand.ts";
import type { IPendingApplicationDoc } from "../src/models/PendingApplication.ts";

function createPending(
  overrides: Partial<IPendingApplicationDoc> = {},
): IPendingApplicationDoc {
  return {
    _id: new Types.ObjectId(),
    vacancyId: new Types.ObjectId(),
    fingerprint: "fp",
    channel: "telegram",
    recipient: "@hr",
    profile: "frontend",
    draftMessageId: 42,
    notificationChatId: "-1001",
    status: "pending",
    ...overrides,
  } as IPendingApplicationDoc;
}

const baseDeps = {
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
    sendMessage: async () => ({}),
  } as never,
  gmail: { enabled: false },
  applySend: { telegramSendEnabled: true, emailSendEnabled: true },
};

describe("handleConfirmCommandMessage", () => {
  it("ignores messages without /send", async () => {
    let called = false;
    const services: IConfirmCommandServices = {
      findPendingByDraftMessage: async () => {
        called = true;
        return null;
      },
      executePendingApplication: async () => {},
    };

    await handleConfirmCommandMessage("hello", 42, baseDeps, services);
    assert.equal(called, false);
  });

  it("replies already sent for sent status", async () => {
    const sentMessages: string[] = [];
    const pending = createPending({ status: "sent" });
    const services: IConfirmCommandServices = {
      findPendingByDraftMessage: async () => pending,
      executePendingApplication: async () => {},
    };

    await handleConfirmCommandMessage(
      "/send",
      42,
      {
        ...baseDeps,
        telegramClient: {
          sendMessage: async (
            _target: unknown,
            params: { message: string },
          ) => {
            sentMessages.push(params.message);
          },
        } as never,
      },
      services,
    );
    assert.deepEqual(sentMessages, ["Уже отправлено"]);
  });

  it("executes pending application on confirm", async () => {
    let executed = false;
    const pending = createPending({ status: "pending" });
    const services: IConfirmCommandServices = {
      findPendingByDraftMessage: async () => pending,
      executePendingApplication: async () => {
        executed = true;
      },
    };

    await handleConfirmCommandMessage("/send", 42, baseDeps, services);
    assert.equal(executed, true);
  });
});
