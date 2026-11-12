import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTelegramApplyMessage,
  formatTelegramResumeCaption,
} from "../src/apply/sendTelegramApply.ts";

describe("formatTelegramApplyMessage", () => {
  it("prefixes cover letter with vacancy title", () => {
    const text = formatTelegramApplyMessage("Здравствуйте", "Senior React Developer");
    assert.match(text, /^Вакансия: Senior React Developer/);
    assert.match(text, /Здравствуйте/);
  });

  it("leaves cover letter unchanged when title is missing", () => {
    assert.equal(formatTelegramApplyMessage("Hello"), "Hello");
  });
});

describe("formatTelegramResumeCaption", () => {
  it("includes vacancy title in resume caption", () => {
    assert.equal(
      formatTelegramResumeCaption("Frontend Developer"),
      "Резюме — Frontend Developer",
    );
  });
});
