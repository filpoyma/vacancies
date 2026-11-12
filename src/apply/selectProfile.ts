import type { TApplyProfileId } from "../config/types.ts";
import { normalizeText } from "../vacancy/normalizer.ts";

const FULLSTACK_PATTERNS: RegExp[] = [
  /\bfull[\s-]?stack\b/i,
  /\bфулл[\s-]?стек\b/i,
  /\bfullstack\b/i,
];

const FRONTEND_ONLY_PATTERNS: RegExp[] = [
  /\bfront[\s-]?end\b/i,
  /\bfrontend\b/i,
  /\breact\b/i,
  /\bфронт[\s-]?енд\b/i,
  /\bui\s+developer\b/i,
];

export type TApplyProfileConfidence = "certain" | "ambiguous";

export interface IApplyProfileDecision {
  profile: TApplyProfileId;
  confidence: TApplyProfileConfidence;
}

function buildHaystack(title: string | undefined, description: string): string {
  const titlePart = title === undefined ? "" : title;
  return normalizeText(`${titlePart}\n${description}`);
}

function hasFullstackSignal(haystack: string): boolean {
  return FULLSTACK_PATTERNS.some((pattern) => pattern.test(haystack));
}

function hasFrontendSignal(haystack: string): boolean {
  return FRONTEND_ONLY_PATTERNS.some((pattern) => pattern.test(haystack));
}

function hasNodeBackendSignal(haystack: string): boolean {
  return (
    /\bnode(\.js|js)?\b/.test(haystack) &&
    (/\bbackend\b/.test(haystack) || /\bback[\s-]?end\b/.test(haystack))
  );
}

export function resolveApplyProfile(
  title: string | undefined,
  description: string,
): IApplyProfileDecision {
  const haystack = buildHaystack(title, description);
  const fullstack = hasFullstackSignal(haystack) || hasNodeBackendSignal(haystack);
  const frontend = hasFrontendSignal(haystack);

  if (fullstack && hasFullstackSignal(haystack)) {
    return { profile: "fullstack", confidence: "certain" };
  }

  if (fullstack && !frontend) {
    return { profile: "fullstack", confidence: "certain" };
  }

  if (frontend && !fullstack) {
    return { profile: "frontend", confidence: "certain" };
  }

  if (fullstack && frontend) {
    return { profile: "fullstack", confidence: "ambiguous" };
  }

  return { profile: "frontend", confidence: "ambiguous" };
}

/** @deprecated Use resolveApplyProfile — kept for tests that only need the profile id. */
export function selectApplyProfile(
  title: string | undefined,
  description: string,
): TApplyProfileId {
  return resolveApplyProfile(title, description).profile;
}

export function formatProfileLabel(profile: TApplyProfileId): string {
  return profile === "fullstack" ? "Fullstack" : "Frontend";
}
