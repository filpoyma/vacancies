import type { IFiltersConfig } from "../config/types.ts";
import { normalizeSkill, normalizeText } from "./normalizer.ts";
import type { IMatchResult, IParsedVacancy, IVacancyMatcher } from "./types.ts";

const SKILL_WEIGHTS: Record<string, number> = {
  react: 20,
  typescript: 15,
  "node.js": 15,
  "react native": 15,
};

const ROLE_KEYWORD_WEIGHT = 10;
const REMOTE_WEIGHT = 15;
const FULLSTACK_WEIGHT = 10;
const SALARY_MATCH_WEIGHT = 10;
const EXCLUDED_KEYWORD_PENALTY = -30;
const OFFICE_ONLY_PENALTY = -25;
const REMOTE_REQUIRED_PENALTY = -25;

const OFFICE_ONLY_PATTERNS = [
  /\boffice\s+only\b/i,
  /только\s+офис/i,
  /в\s+офисе/i,
];

export class RuleBasedMatcher implements IVacancyMatcher {
  private readonly filters: IFiltersConfig;

  constructor(filters: IFiltersConfig) {
    this.filters = filters;
  }

  async match(vacancy: IParsedVacancy): Promise<IMatchResult> {
    let score = 0;
    const reasons: string[] = [];
    const haystack = normalizeText(
      [vacancy.title, vacancy.company, vacancy.description].filter(Boolean).join(" "),
    );
    const skillSet = new Set(vacancy.skills.map((skill) => normalizeSkill(skill)));

    for (const skill of this.filters.skills) {
      const canonical = normalizeSkill(skill);
      const weight = SKILL_WEIGHTS[canonical];
      if (weight === undefined) {
        continue;
      }

      const matched =
        skillSet.has(canonical) || haystack.includes(normalizeText(skill));
      if (!matched) {
        continue;
      }

      score += weight;
      reasons.push(`+${weight} ${canonical}`);
    }

    for (const role of this.filters.roles) {
      if (haystack.includes(normalizeText(role))) {
        score += ROLE_KEYWORD_WEIGHT;
        reasons.push(`+${ROLE_KEYWORD_WEIGHT} role: ${role}`);
        break;
      }
    }

    if (haystack.includes("fullstack") || haystack.includes("full stack")) {
      score += FULLSTACK_WEIGHT;
      reasons.push(`+${FULLSTACK_WEIGHT} fullstack`);
    }

    if (vacancy.remote === true) {
      score += REMOTE_WEIGHT;
      reasons.push(`+${REMOTE_WEIGHT} remote`);
    }

    if (this.filters.remoteOnly && vacancy.remote !== true) {
      score += REMOTE_REQUIRED_PENALTY;
      reasons.push(`${REMOTE_REQUIRED_PENALTY} remote required`);
    }

    if (
      vacancy.salary?.min !== undefined &&
      vacancy.salary.currency === this.filters.salary.currency &&
      vacancy.salary.min >= this.filters.salary.min
    ) {
      score += SALARY_MATCH_WEIGHT;
      reasons.push(`+${SALARY_MATCH_WEIGHT} salary >= target`);
    }

    for (const keyword of this.filters.excludedKeywords) {
      if (haystack.includes(normalizeText(keyword))) {
        score += EXCLUDED_KEYWORD_PENALTY;
        reasons.push(`${EXCLUDED_KEYWORD_PENALTY} ${keyword}`);
      }
    }

    if (OFFICE_ONLY_PATTERNS.some((pattern) => pattern.test(haystack))) {
      score += OFFICE_ONLY_PENALTY;
      reasons.push(`${OFFICE_ONLY_PENALTY} office only`);
    }

    const isRelevant = score >= this.filters.minMatchScore;

    return {
      score,
      isRelevant,
      reasons,
    };
  }
}
