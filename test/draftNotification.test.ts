import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatApplyDraftAppend } from "../src/apply/draftNotification.ts";

describe("formatApplyDraftAppend", () => {
  it("includes confirm command and recipient", () => {
    const text = formatApplyDraftAppend(
      { channel: "telegram", recipient: "@hr_user" },
      "frontend",
      "/send",
    );
    assert.match(text, /Отклик: Telegram @hr_user/);
    assert.match(text, /профиль Frontend/);
    assert.match(text, /\/send/);
  });
});
