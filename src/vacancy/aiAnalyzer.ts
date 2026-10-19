import type { IAiConfig, IFiltersConfig } from "../config/types.ts";
import type { IOpenRouterEnv } from "../config/env.ts";
import type { TAppLogger } from "../utils/logger.ts";
import { RuleBasedMatcher } from "./matcher.ts";
import { parseVacancy } from "./parser.ts";
import { normalizeSkills } from "./normalizer.ts";
import type {
  IAnalysisResult,
  IMatchResult,
  IParsedVacancy,
  ISalaryInfo,
  IVacancyAnalyzer,
} from "./types.ts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;

interface IRawAiSalary {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
}

interface IRawAiVacancyResponse {
  isVacancy?: boolean;
  title?: string | null;
  company?: string | null;
  description?: string | null;
  salary?: IRawAiSalary | null;
  location?: string | null;
  remote?: boolean | null;
  skills?: string[] | null;
  experience?: number | null;
  contact?: string | null;
  url?: string | null;
  score?: number | null;
  isRelevant?: boolean | null;
  reasons?: string[] | null;
}

export function extractJsonFromModelContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(trimmed);
  const jsonText = fenced !== null ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function nonEmptyString(value: string | null | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseSalary(raw: IRawAiSalary | null | undefined): ISalaryInfo | undefined {
  if (raw == null) {
    return undefined;
  }
  const next: ISalaryInfo = {};
  if (typeof raw.min === "number" && Number.isFinite(raw.min)) {
    next.min = raw.min;
  }
  if (typeof raw.max === "number" && Number.isFinite(raw.max)) {
    next.max = raw.max;
  }
  const currency = nonEmptyString(raw.currency ?? undefined);
  if (currency !== undefined) {
    next.currency = currency.toUpperCase();
  }
  if (next.min === undefined && next.max === undefined && next.currency === undefined) {
    return undefined;
  }
  return next;
}

/** @internal Exported for tests */
export function mapAiResponseToAnalysis(
  rawText: string,
  payload: unknown,
  minMatchScore: number,
): IAnalysisResult {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("AI response is not a JSON object");
  }

  const raw = payload as IRawAiVacancyResponse;
  const description = nonEmptyString(raw.description) ?? rawText.trim();
  const skills = Array.isArray(raw.skills)
    ? normalizeSkills(raw.skills.filter((s): s is string => typeof s === "string"))
    : [];

  const parsed: IParsedVacancy = {
    isVacancy: raw.isVacancy === true,
    description,
    skills,
  };

  const title = nonEmptyString(raw.title);
  if (title !== undefined) {
    parsed.title = title;
  }
  const company = nonEmptyString(raw.company);
  if (company !== undefined) {
    parsed.company = company;
  }
  const salary = parseSalary(raw.salary);
  if (salary !== undefined) {
    parsed.salary = salary;
  }
  const location = nonEmptyString(raw.location);
  if (location !== undefined) {
    parsed.location = location;
  }
  if (raw.remote === true || raw.remote === false) {
    parsed.remote = raw.remote;
  }
  if (typeof raw.experience === "number" && Number.isFinite(raw.experience)) {
    parsed.experience = raw.experience;
  }
  const contact = nonEmptyString(raw.contact);
  if (contact !== undefined) {
    parsed.contact = contact;
  }
  const url = nonEmptyString(raw.url);
  if (url !== undefined) {
    parsed.url = url;
  }

  let score = 0;
  if (typeof raw.score === "number" && Number.isFinite(raw.score)) {
    score = Math.max(0, Math.min(100, Math.round(raw.score)));
  }

  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons.filter((r): r is string => typeof r === "string" && r.trim() !== "")
    : [];

  const isRelevant =
    raw.isRelevant === true || (raw.isRelevant !== false && score >= minMatchScore);

  const match: IMatchResult = {
    score,
    isRelevant: parsed.isVacancy ? isRelevant : false,
    reasons,
  };

  return { parsed, match, usedAi: true };
}

export function buildVacancyAnalyzerSystemPrompt(
  filters: IFiltersConfig,
  aiConfig?: IAiConfig,
): string {
  const profile = aiConfig?.candidateProfilePrompt?.trim();
  const profileBlock =
    profile !== undefined && profile !== ""
      ? `\nCandidate profile (priority):\n${profile}\n`
      : "";

  return `You are a technical recruiter analyzing Telegram job posts for one candidate.
Extract structured fields and score relevance (0-100).
${profileBlock}
Target roles: ${filters.roles.join(", ")}
Target skills: ${filters.skills.join(", ")}
Undesired primary stacks (penalize only if they dominate the role): ${filters.excludedKeywords.join(", ")}
Remote required: ${filters.remoteOnly ? "yes" : "no"}
Minimum score to mark relevant: ${filters.minMatchScore}

Rules:
- JavaScript is NOT Java. Do not treat JavaScript roles as Java backend jobs.
- Fullstack/React frontend with secondary Python/Go/Node backend is often a good fit.
- Parse RU/EN titles, salaries (от/до, ₽, $, €), remote/удалённо.
- If the message is chat, ads, or not a job post, set isVacancy false and score 0.

Respond with a single JSON object only (no markdown), shape:
{
  "isVacancy": boolean,
  "title": string | null,
  "company": string | null,
  "description": string,
  "salary": { "min": number | null, "max": number | null, "currency": string | null } | null,
  "location": string | null,
  "remote": boolean | null,
  "skills": string[],
  "experience": number | null,
  "contact": string | null,
  "url": string | null,
  "score": number,
  "isRelevant": boolean,
  "reasons": string[]
}`;
}

class RuleBasedVacancyAnalyzer implements IVacancyAnalyzer {
  private readonly matcher: RuleBasedMatcher;

  constructor(filters: IFiltersConfig) {
    this.matcher = new RuleBasedMatcher(filters);
  }

  async analyze(rawText: string): Promise<IAnalysisResult> {
    const parsed = parseVacancy(rawText);
    const match = await this.matcher.match(parsed);
    return { parsed, match, usedAi: false };
  }
}

class OpenRouterVacancyAnalyzer implements IVacancyAnalyzer {
  private readonly openRouter: IOpenRouterEnv;
  private readonly filters: IFiltersConfig;
  private readonly aiConfig: IAiConfig | undefined;
  private readonly log: TAppLogger;

  constructor(
    openRouter: IOpenRouterEnv,
    filters: IFiltersConfig,
    aiConfig: IAiConfig | undefined,
    log: TAppLogger,
  ) {
    this.openRouter = openRouter;
    this.filters = filters;
    this.aiConfig = aiConfig;
    this.log = log;
  }

  async analyze(rawText: string): Promise<IAnalysisResult> {
    const apiKey = this.openRouter.apiKey;
    if (apiKey === undefined) {
      throw new Error("OpenRouter API key is not configured");
    }

    const systemPrompt = buildVacancyAnalyzerSystemPrompt(this.filters, this.aiConfig);
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/filpoyma/vacancies",
        "X-Title": "telegram-vacancy-monitor",
      },
      body: JSON.stringify({
        model: this.openRouter.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawText },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter HTTP ${response.status}: ${body.slice(0, 500)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (content === undefined || content.trim() === "") {
      throw new Error("OpenRouter returned empty message content");
    }

    const payload = extractJsonFromModelContent(content);
    const result = mapAiResponseToAnalysis(
      rawText,
      payload,
      this.filters.minMatchScore,
    );
    this.log.info(
      `AI analysis: score=${result.match.score} relevant=${result.match.isRelevant}`,
    );
    return result;
  }
}

class CompositeVacancyAnalyzer implements IVacancyAnalyzer {
  private readonly primary: IVacancyAnalyzer | null;
  private readonly fallback: IVacancyAnalyzer;
  private readonly log: TAppLogger;

  constructor(
    primary: IVacancyAnalyzer | null,
    fallback: IVacancyAnalyzer,
    log: TAppLogger,
  ) {
    this.primary = primary;
    this.fallback = fallback;
    this.log = log;
  }

  async analyze(rawText: string): Promise<IAnalysisResult> {
    if (this.primary !== null) {
      try {
        return await this.primary.analyze(rawText);
      } catch (error: unknown) {
        const detail = error instanceof Error ? error.message : String(error);
        this.log.warn(`AI vacancy analysis failed, using rule-based fallback: ${detail}`);
      }
    }
    return this.fallback.analyze(rawText);
  }
}

export function createVacancyAnalyzer(
  filters: IFiltersConfig,
  aiConfig: IAiConfig | undefined,
  openRouter: IOpenRouterEnv,
  log: TAppLogger,
): IVacancyAnalyzer {
  const fallback = new RuleBasedVacancyAnalyzer(filters);
  const primary =
    openRouter.enabled
      ? new OpenRouterVacancyAnalyzer(openRouter, filters, aiConfig, log)
      : null;

  if (primary === null) {
    log.info("OpenRouter disabled (no OPENROUTER_API_KEY); using rule-based analyzer");
  } else {
    log.info(`OpenRouter enabled (model ${openRouter.model})`);
  }

  return new CompositeVacancyAnalyzer(primary, fallback, log);
}
