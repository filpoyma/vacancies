import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  looksLikeSendToCommand,
  parseSendToCommand,
} from "../src/apply/parseSendToCommand.ts";

describe("parseSendToCommand", () => {
  it("parses telegram username with profile", () => {
    assert.deepEqual(parseSendToCommand("/sendto @Romantra fullstack"), {
      channel: "telegram",
      recipient: "@Romantra",
      profile: "fullstack",
    });
  });

  it("parses username without at sign", () => {
    assert.deepEqual(parseSendToCommand("/sendto Romantra frontend"), {
      channel: "telegram",
      recipient: "@Romantra",
      profile: "frontend",
    });
  });

  it("parses email mode", () => {
    assert.deepEqual(parseSendToCommand("/sendto email fullstack"), {
      channel: "email",
      recipient: "",
      profile: "fullstack",
    });
  });

  it("parses explicit email address", () => {
    assert.deepEqual(
      parseSendToCommand("/sendto poymaza@gmail.com frontend"),
      {
        channel: "email",
        recipient: "poymaza@gmail.com",
        profile: "frontend",
      },
    );
  });

  it("rejects invalid profile", () => {
    assert.equal(parseSendToCommand("/sendto @user mid"), undefined);
  });

  it("rejects incomplete sendto", () => {
    assert.equal(parseSendToCommand("/sendto poymaza@gmail.com"), undefined);
    assert.equal(looksLikeSendToCommand("/sendto poymaza@gmail.com"), true);
  });
});
