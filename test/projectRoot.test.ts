import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { getProjectRoot } from "../src/utils/projectRoot.ts";

describe("getProjectRoot", () => {
  it("resolves to the directory that contains package.json", () => {
    const root = getProjectRoot();
    const packageJsonPath = resolve(root, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      name: string;
    };
    assert.equal(packageJson.name, "telegram-vacancy-monitor");
  });
});
