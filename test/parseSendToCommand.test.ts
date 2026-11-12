import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSendToCommand } from "../src/apply/parseSendToCommand.ts";

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

  it("rejects invalid profile", () => {
    assert.equal(parseSendToCommand("/sendto @user mid"), undefined);
  });
});
