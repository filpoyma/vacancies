import { normalizeText } from "./normalizer.ts";

const FRONTEND_ROLE_PATTERNS: RegExp[] = [
  /\bfront[-\s]?end\b/,
  /\bfrontend\s+developer\b/,
  /разработчик\s+front[-\s]?end/,
  /front[-\s]?end\s+разработчик/,
  /разработчик\s+frontend/,
];

export interface IRoleMatch {
  label: string;
}

export function findRoleMatch(
  haystack: string,
  configuredRoles: string[],
): IRoleMatch | undefined {
  for (const role of configuredRoles) {
    const normalizedRole = normalizeText(role);
    if (normalizedRole !== "" && haystack.includes(normalizedRole)) {
      return { label: role };
    }
  }

  for (const pattern of FRONTEND_ROLE_PATTERNS) {
    if (pattern.test(haystack)) {
      return { label: "front-end" };
    }
  }

  if (haystack.includes("разработчик") && /\breact(\.js|js)?\b/.test(haystack)) {
    return { label: "react developer" };
  }

  return undefined;
}
