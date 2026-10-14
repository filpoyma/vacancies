import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findConfiguredDialog } from "../src/telegram/monitorSources.ts";
import type { ITelegramSource } from "../src/telegram/types.ts";

describe("findConfiguredDialog", () => {
  const dialogs: ITelegramSource[] = [
    {
      id: "-1001",
      title: "Private Channel",
      type: "channel",
      username: null as unknown as string,
    },
    {
      id: "-1002",
      title: "Public Jobs",
      type: "channel",
      username: "publicjobs",
    },
  ];

  it("matches by username when another dialog has null username", () => {
    const match = findConfiguredDialog(
      { username: "publicjobs", name: "Public Jobs" },
      dialogs,
    );

    assert.equal(match?.id, "-1002");
  });

  it("ignores null config username and matches by name", () => {
    const match = findConfiguredDialog(
      { id: "-1001", name: "Private Channel", username: null as unknown as string },
      dialogs,
    );

    assert.equal(match?.id, "-1001");
  });
});
