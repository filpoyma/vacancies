import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFingerprint } from "../src/vacancy/deduplicator.ts";
import { parseVacancy } from "../src/vacancy/parser.ts";

describe("buildFingerprint", () => {
  it("matches same vacancy with different channel footers", () => {
    const base = `
We are hiring Senior React Developer
Company: Acme Corp
Remote, $4,000-5,000 USD
Stack: React, TypeScript, Node.js
    `.trim();

    const withFooterA = `${base}\n\nPosted via Jobs Channel A`;
    const withFooterB = `${base}\n\nSubscribe @daily_jobs`;

    const fingerprintA = buildFingerprint(parseVacancy(withFooterA));
    const fingerprintB = buildFingerprint(parseVacancy(withFooterB));

    assert.equal(fingerprintA, fingerprintB);
  });

  it("differs for different titles", () => {
    const first = parseVacancy("Hiring Senior React Developer at Acme $4000");
    const second = parseVacancy("Hiring Junior Vue Developer at Acme $4000");

    assert.notEqual(buildFingerprint(first), buildFingerprint(second));
  });
});
