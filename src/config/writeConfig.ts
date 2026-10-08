import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IAppConfig, ISourceConfig } from "./types.ts";
import { getProjectRoot } from "../utils/projectRoot.ts";

function quoteString(value: string): string {
  return JSON.stringify(value);
}

function nonEmptyField(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function sanitizeSourceConfig(source: ISourceConfig): ISourceConfig {
  const next: ISourceConfig = {};
  const id = nonEmptyField(source.id);
  const name = nonEmptyField(source.name);
  const username = nonEmptyField(source.username);

  if (id !== undefined) {
    next.id = id;
  }
  if (name !== undefined) {
    next.name = name;
  }
  if (username !== undefined) {
    next.username = username;
  }

  return next;
}

function formatSourceEntry(source: ISourceConfig): string {
  const sanitized = sanitizeSourceConfig(source);
  const fields: string[] = [];

  if (sanitized.id !== undefined) {
    fields.push(`id: ${quoteString(sanitized.id)}`);
  }
  if (sanitized.name !== undefined) {
    fields.push(`name: ${quoteString(sanitized.name)}`);
  }
  if (sanitized.username !== undefined) {
    fields.push(`username: ${quoteString(sanitized.username)}`);
  }

  if (fields.length === 0) {
    return "      {},";
  }

  return `      {\n        ${fields.join(",\n        ")},\n      },`;
}

function formatStringList(values: string[], indent: string): string {
  return values.map((value) => `${indent}${quoteString(value)},`).join("\n");
}

export function formatAppConfigFile(config: IAppConfig): string {
  const sourcesBlock = config.telegram.sources
    .map(sanitizeSourceConfig)
    .map(formatSourceEntry)
    .join("\n");

  return `import type { IAppConfig } from "../src/config/types.ts";

export const config: IAppConfig = {
  telegram: {
    sources: [
${sourcesBlock}
    ],
  },

  filters: {
    roles: [
${formatStringList(config.filters.roles, "      ")}
    ],

    skills: [${config.filters.skills.map((s) => quoteString(s)).join(", ")}],

    excludedKeywords: [${config.filters.excludedKeywords.map((s) => quoteString(s)).join(", ")}],

    salary: {
      min: ${config.filters.salary.min},
      currency: ${quoteString(config.filters.salary.currency)},
    },

    remoteOnly: ${String(config.filters.remoteOnly)},

    minMatchScore: ${config.filters.minMatchScore},
  },

  notifications: {
    target: ${quoteString(config.notifications.target)},
    targetTitle: ${quoteString(config.notifications.targetTitle)},
  },
};
`;
}

export async function writeAppConfig(config: IAppConfig): Promise<void> {
  const configPath = resolve(getProjectRoot(), "config/config.ts");
  await writeFile(configPath, formatAppConfigFile(config), "utf8");
}
