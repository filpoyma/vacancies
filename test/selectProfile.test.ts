import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveApplyProfile,
  selectApplyProfile,
} from "../src/apply/selectProfile.ts";

describe("selectApplyProfile", () => {
  it("chooses fullstack when title mentions fullstack", () => {
    assert.equal(
      selectApplyProfile("Senior Fullstack Developer", "React and Node"),
      "fullstack",
    );
  });

  it("chooses frontend for front-end vacancy", () => {
    assert.equal(
      selectApplyProfile("React Frontend Developer", "UI with TypeScript"),
      "frontend",
    );
  });

  it("defaults to frontend when ambiguous", () => {
    assert.equal(selectApplyProfile("Developer", "General job"), "frontend");
  });
});

describe("resolveApplyProfile", () => {
  it("marks fullstack title as certain", () => {
    const decision = resolveApplyProfile("Senior Fullstack Developer", "React");
    assert.equal(decision.profile, "fullstack");
    assert.equal(decision.confidence, "certain");
  });

  it("marks frontend-only title as certain", () => {
    const decision = resolveApplyProfile(
      "Frontend Developer",
      "React TypeScript",
    );
    assert.equal(decision.profile, "frontend");
    assert.equal(decision.confidence, "certain");
  });

  it("marks generic title as ambiguous", () => {
    const decision = resolveApplyProfile("Developer", "Remote job");
    assert.equal(decision.profile, "frontend");
    assert.equal(decision.confidence, "ambiguous");
  });

  it("marks mixed signals as ambiguous", () => {
    const decision = resolveApplyProfile(
      "React developer",
      "Node.js backend tasks",
    );
    assert.equal(decision.confidence, "ambiguous");
  });
});
