import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTelegramMessageUrl } from "../src/telegram/messageUrl.ts";

describe("buildTelegramMessageUrl", () => {
  it("builds public username link", () => {
    const url = buildTelegramMessageUrl(
      { id: "-1001", username: "reactjobs" },
      42,
    );
    assert.equal(url, "https://t.me/reactjobs/42");
  });

  it("builds private supergroup link", () => {
    const url = buildTelegramMessageUrl({ id: "-1001234567890" }, 99);
    assert.equal(url, "https://t.me/c/1234567890/99");
  });
});
