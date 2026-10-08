import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatVacancyNotificationMessage } from "../src/notifications/telegram.ts";
import type { IParsedVacancy } from "../src/vacancy/types.ts";

describe("formatVacancyNotificationMessage", () => {
  it("formats vacancy notification with link", () => {
    const parsed: IParsedVacancy = {
      isVacancy: true,
      title: "Senior React Developer",
      description: "desc",
      skills: ["react", "typescript", "node.js"],
      remote: true,
      salary: { min: 4000, max: 5000, currency: "USD" },
      url: "https://t.me/reactjobs/42",
    };

    const message = formatVacancyNotificationMessage(
      parsed,
      { score: 94, isRelevant: true, reasons: [] },
      "React Jobs",
      "https://t.me/reactjobs/42",
    );

    assert.match(message, /НОВАЯ ВАКАНСИЯ/);
    assert.match(message, /Senior React Developer/);
    assert.match(message, /\$4,000–5,000/);
    assert.match(message, /Match: 94%/);
    assert.match(message, /React Jobs/);
    assert.match(message, /href="https:\/\/t\.me\/reactjobs\/42"/);
  });
});
