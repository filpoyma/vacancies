import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVacancy } from "../src/vacancy/parser.ts";

describe("parseVacancy", () => {
  it("detects English hiring post", () => {
    const text = `
We are hiring a Senior React Developer
Remote, $4,000–5,000 USD
Stack: React, TypeScript, Node.js
3+ years experience
Contact: @hr_team
https://example.com/jobs/1
    `.trim();

    const parsed = parseVacancy(text);
    assert.equal(parsed.isVacancy, true);
    assert.match(parsed.title ?? "", /React Developer/i);
    assert.equal(parsed.remote, true);
    assert.equal(parsed.salary?.min, 4000);
    assert.equal(parsed.salary?.max, 5000);
    assert.equal(parsed.salary?.currency, "USD");
    assert.ok(parsed.skills.includes("react"));
    assert.equal(parsed.experience, 3);
    assert.equal(parsed.contact, "@hr_team");
    assert.equal(parsed.url, "https://example.com/jobs/1");
  });

  it("detects Russian vacancy post", () => {
    const text = `
Вакансия: Middle Frontend разработчик
Компания: Acme Corp
Удаленно, от 250000 руб
Ищем специалиста с React и TypeScript, опыт от 2 лет
Пишите: jobs@acme.dev
    `.trim();

    const parsed = parseVacancy(text);
    assert.equal(parsed.isVacancy, true);
    assert.equal(parsed.company, "Acme Corp");
    assert.equal(parsed.remote, true);
    assert.equal(parsed.salary?.currency, "RUB");
    assert.equal(parsed.salary?.min, 250000);
    assert.ok(parsed.skills.includes("react"));
    assert.equal(parsed.experience, 2);
    assert.equal(parsed.contact, "jobs@acme.dev");
  });

  it("rejects casual chat message", () => {
    const parsed = parseVacancy("Привет! Кто смотрел матч вчера?");
    assert.equal(parsed.isVacancy, false);
  });
});
