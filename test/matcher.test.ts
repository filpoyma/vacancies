import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IFiltersConfig } from "../src/config/types.ts";
import { RuleBasedMatcher } from "../src/vacancy/matcher.ts";
import type { IParsedVacancy } from "../src/vacancy/types.ts";

const filters: IFiltersConfig = {
  roles: ["React Developer", "Frontend Developer"],
  skills: ["React", "TypeScript", "Node.js", "React Native"],
  excludedKeywords: ["PHP", "WordPress", "1C"],
  salary: { min: 3000, currency: "USD" },
  remoteOnly: true,
  minMatchScore: 70,
};

const vacancy: IParsedVacancy = {
  isVacancy: true,
  title: "Senior React Developer",
  description:
    "Remote role. Stack: React, TypeScript, Node.js. Salary $4,000-5,000 USD.",
  skills: ["react", "typescript", "node.js"],
  remote: true,
  salary: { min: 4000, max: 5000, currency: "USD" },
};

describe("RuleBasedMatcher", () => {
  it("scores relevant remote React vacancy above threshold", async () => {
    const matcher = new RuleBasedMatcher(filters);
    const result = await matcher.match(vacancy);

    assert.ok(result.score >= 70);
    assert.equal(result.isRelevant, true);
    assert.ok(result.reasons.length > 0);
  });

  it("penalizes excluded stack and fails threshold", async () => {
    const matcher = new RuleBasedMatcher(filters);
    const result = await matcher.match({
      ...vacancy,
      description: `${vacancy.description} WordPress plugin maintenance`,
      skills: ["react", "php"],
    });

    assert.ok(result.score < 70);
    assert.equal(result.isRelevant, false);
    assert.ok(result.reasons.some((reason) => reason.includes("WordPress")));
  });

  it("uses minMatchScore from config, not hardcoded value", async () => {
    const strictFilters: IFiltersConfig = {
      ...filters,
      minMatchScore: 200,
    };
    const matcher = new RuleBasedMatcher(strictFilters);
    const result = await matcher.match(vacancy);
    assert.equal(result.isRelevant, false);
  });
});
