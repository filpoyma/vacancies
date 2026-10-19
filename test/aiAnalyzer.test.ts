import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createVacancyAnalyzer,
  extractJsonFromModelContent,
  mapAiResponseToAnalysis,
} from "../src/vacancy/aiAnalyzer.ts";
import type { IFiltersConfig } from "../src/config/types.ts";

const filters: IFiltersConfig = {
  roles: ["Frontend Developer", "React Developer"],
  skills: ["React", "TypeScript", "JavaScript", "Node.js"],
  excludedKeywords: ["PHP"],
  salary: { min: 100000, currency: "RUB" },
  remoteOnly: true,
  minMatchScore: 60,
};

const noopLog = {
  info(): void {},
  warn(): void {},
  error(): void {},
};

describe("extractJsonFromModelContent", () => {
  it("parses fenced JSON", () => {
    const payload = extractJsonFromModelContent(
      '```json\n{"isVacancy":true,"score":80}\n```',
    ) as { score: number };
    assert.equal(payload.score, 80);
  });
});

describe("mapAiResponseToAnalysis", () => {
  it("maps AI JSON to parsed vacancy and match", () => {
    const result = mapAiResponseToAnalysis(
      "raw post",
      {
        isVacancy: true,
        title: "React Developer",
        description: "Remote React role",
        remote: true,
        skills: ["React", "TypeScript"],
        score: 85,
        isRelevant: true,
        reasons: ["Strong React match", "Remote"],
      },
      60,
    );

    assert.equal(result.parsed.isVacancy, true);
    assert.equal(result.parsed.title, "React Developer");
    assert.equal(result.match.score, 85);
    assert.equal(result.match.isRelevant, true);
    assert.equal(result.usedAi, true);
  });
});

describe("createVacancyAnalyzer", () => {
  it("uses rule-based analyzer when OpenRouter is disabled", async () => {
    const analyzer = createVacancyAnalyzer(
      filters,
      undefined,
      { enabled: false, model: "google/gemini-2.5-flash" },
      noopLog,
    );

    const result = await analyzer.analyze(
      "Remote Senior React Developer. Stack React, TypeScript, Node.js. Hiring now.",
    );

    assert.equal(result.usedAi, false);
    assert.equal(result.parsed.isVacancy, true);
    assert.ok(result.match.score >= 0);
  });

  it("falls back to rule-based analyzer when OpenRouter request fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("network down");
    };

    try {
      const analyzer = createVacancyAnalyzer(
        filters,
        undefined,
        { apiKey: "test-key", model: "google/gemini-2.5-flash", enabled: true },
        noopLog,
      );

      const result = await analyzer.analyze(
        "Remote Senior React Developer. Stack React, TypeScript, Node.js. Hiring now.",
      );

      assert.equal(result.usedAi, false);
      assert.equal(result.parsed.isVacancy, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
