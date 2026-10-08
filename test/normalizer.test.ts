import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCoreDescription,
  detectSkillsFromText,
  normalizeSkill,
  normalizeSkills,
  normalizeText,
} from "../src/vacancy/normalizer.ts";

describe("normalizer", () => {
  it("normalizes react aliases to react", () => {
    assert.equal(normalizeSkill("React.js"), "react");
    assert.equal(normalizeSkill("reactjs"), "react");
    assert.equal(normalizeSkill("React JS"), "react");
  });

  it("normalizes node aliases to node.js", () => {
    assert.equal(normalizeSkill("Node"), "node.js");
    assert.equal(normalizeSkill("NodeJS"), "node.js");
    assert.equal(normalizeSkill("node.js"), "node.js");
  });

  it("detects skills from mixed text", () => {
    const skills = detectSkillsFromText("Stack: React.js, TS, NodeJS");
    assert.ok(skills.includes("react"));
    assert.ok(skills.includes("typescript"));
    assert.ok(skills.includes("node.js"));
  });

  it("deduplicates skills after normalization", () => {
    const skills = normalizeSkills(["reactjs", "React.js", "react"]);
    assert.deepEqual(skills, ["react"]);
  });

  it("collapses whitespace and unicode", () => {
    assert.equal(normalizeText("  Hello\u00A0World  "), "hello world");
  });

  it("builds core description without links and mentions", () => {
    const core = buildCoreDescription(
      "Senior dev https://example.com write @hr_team please",
      10,
    );
    assert.equal(core.includes("https://"), false);
    assert.equal(core.includes("@hr_team"), false);
    assert.match(core, /senior dev/);
  });
});
