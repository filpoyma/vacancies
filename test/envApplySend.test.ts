import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEnvBoolean } from "../src/config/env.ts";

describe("parseEnvBoolean", () => {
  it("defaults when unset", () => {
    assert.equal(parseEnvBoolean("X", undefined, true), true);
    assert.equal(parseEnvBoolean("X", "", false), false);
  });

  it("parses true and false", () => {
    assert.equal(parseEnvBoolean("X", "true", false), true);
    assert.equal(parseEnvBoolean("X", "false", true), false);
    assert.equal(parseEnvBoolean("X", "0", true), false);
    assert.equal(parseEnvBoolean("X", "1", false), true);
  });
});
