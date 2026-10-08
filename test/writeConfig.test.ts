import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAppConfigFile,
  sanitizeSourceConfig,
} from "../src/config/writeConfig.ts";
import type { IAppConfig } from "../src/config/types.ts";

const sampleConfig: IAppConfig = {
  telegram: {
    sources: [
      { id: "-1001", name: "React Jobs", username: "reactjobs" },
    ],
  },
  filters: {
    roles: ["Frontend Developer"],
    skills: ["React"],
    excludedKeywords: ["PHP"],
    salary: { min: 3000, currency: "USD" },
    remoteOnly: true,
    minMatchScore: 80,
  },
  notifications: {
    target: "me",
    targetTitle: "Сохраненные вакансии",
  },
};

describe("formatAppConfigFile", () => {
  it("drops null username fields", () => {
    const sanitized = sanitizeSourceConfig({
      id: "-1001",
      name: "Jobs",
      username: null as unknown as string,
    });
    assert.equal(sanitized.username, undefined);
    assert.equal(sanitized.id, "-1001");
  });

  it("writes sources with id and name", () => {
    const content = formatAppConfigFile(sampleConfig);
    assert.match(content, /id: "-1001"/);
    assert.match(content, /name: "React Jobs"/);
    assert.match(content, /username: "reactjobs"/);
    assert.match(content, /export const config: IAppConfig/);
  });
});
