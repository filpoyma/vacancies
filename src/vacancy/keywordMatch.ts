function normalizeKeyword(keyword: string): string {
  return keyword.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whether {@link normalizedHaystack} mentions {@link keyword} as its own token.
 * Avoids false positives such as Java inside JavaScript.
 */
export function textContainsKeyword(
  normalizedHaystack: string,
  keyword: string,
): boolean {
  const term = normalizeKeyword(keyword);
  if (term === "") {
    return false;
  }

  if (term === "java") {
    return /(?<![a-z])java(?!script)/.test(normalizedHaystack);
  }

  if (/^[a-z0-9.#+]+$/i.test(term)) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i");
    return pattern.test(normalizedHaystack);
  }

  return normalizedHaystack.includes(term);
}

/**
 * Skill search term in normalized vacancy text (same Java/JavaScript rules as keywords).
 */
export function textContainsSkillTerm(normalizedHaystack: string, term: string): boolean {
  const normalizedTerm = normalizeKeyword(term);
  if (normalizedTerm === "") {
    return false;
  }

  if (normalizedTerm === "java") {
    return /(?<![a-z])java(?!script)/.test(normalizedHaystack);
  }

  return normalizedHaystack.includes(normalizedTerm);
}
