import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTelegramDialogsTable } from "../src/telegram/dialogs.ts";
import type { ITelegramSource } from "../src/telegram/types.ts";

describe("formatTelegramDialogsTable", () => {
  it("formats header and rows", () => {
    const sources: ITelegramSource[] = [
      {
        id: "-100123456789",
        title: "React Jobs",
        type: "channel",
      },
      {
        id: "-100987654321",
        title: "Node.js Jobs",
        type: "supergroup",
        username: "nodejsjobs",
      },
    ];

    const table = formatTelegramDialogsTable(sources);
    assert.match(table, /^ID\s+TYPE\s+TITLE/m);
    assert.match(table, /-100123456789\s+channel\s+React Jobs/);
    assert.match(table, /-100987654321\s+supergroup\s+Node\.js Jobs/);
  });

  it("marks configured rows when isConfigured is provided", () => {
    const sources: ITelegramSource[] = [
      {
        id: "-100123456789",
        title: "React Jobs",
        type: "channel",
      },
      {
        id: "-100987654321",
        title: "Node.js Jobs",
        type: "supergroup",
      },
    ];

    const table = formatTelegramDialogsTable(sources, {
      isConfigured: (source) => source.id === "-100123456789",
    });

    assert.match(table, /in config \(\+\)/);
    assert.match(table, /\(\+\) -100123456789/);
    assert.match(table, /\(-\) -100987654321/);
  });
});
