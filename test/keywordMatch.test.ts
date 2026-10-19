import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { textContainsKeyword } from "../src/vacancy/keywordMatch.ts";

describe("textContainsKeyword", () => {
  it("does not treat JavaScript as Java", () => {
    const haystack =
      "разработчик front-end (javascript). хорошие знания javascript, react.js";
    assert.equal(textContainsKeyword(haystack, "Java"), false);
  });

  it("still matches Java as a separate stack", () => {
    const haystack = "backend: java, spring boot, kotlin";
    assert.equal(textContainsKeyword(haystack, "Java"), true);
  });
});
