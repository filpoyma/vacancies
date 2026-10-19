import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findRoleMatch, titleMentionsConfiguredRole } from "../src/vacancy/roleMatch.ts";

describe("findRoleMatch", () => {
  it("matches Russian front-end title without English role strings", () => {
    const haystack =
      "разработчик front-end (javascript). много писать на react";
    const match = findRoleMatch(haystack, ["Frontend Developer"]);
    assert.equal(match?.label, "front-end");
  });

  it("matches configured English role", () => {
    const haystack = "hiring senior react developer remote";
    const match = findRoleMatch(haystack, ["React Developer"]);
    assert.equal(match?.label, "React Developer");
  });
});

describe("titleMentionsConfiguredRole", () => {
  it("returns true when title contains a configured role phrase", () => {
    assert.equal(
      titleMentionsConfiguredRole("Senior React Developer", ["React Developer"]),
      true,
    );
  });

  it("returns false when title has no configured role phrase", () => {
    assert.equal(
      titleMentionsConfiguredRole("Разработчик front-end (JavaScript)", [
        "Frontend Developer",
      ]),
      false,
    );
  });
});
