import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractApplyTargetFromText } from "../src/apply/extractApplyTarget.ts";

describe("extractApplyTargetFromText", () => {
  it("prefers telegram over email", () => {
    const target = extractApplyTargetFromText(
      "Пишите @Hiring_Manager или hr@company.com",
    );
    assert.deepEqual(target, { channel: "telegram", recipient: "@Hiring_Manager" });
  });

  it("extracts t.me username", () => {
    const target = extractApplyTargetFromText("Контакт: https://t.me/recruiter_name");
    assert.deepEqual(target, {
      channel: "telegram",
      recipient: "@recruiter_name",
    });
  });

  it("falls back to email when no telegram", () => {
    const target = extractApplyTargetFromText("Отправляйте резюме на jobs@acme.io");
    assert.deepEqual(target, { channel: "email", recipient: "jobs@acme.io" });
  });
});
