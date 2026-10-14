import type { TelegramClient } from "teleproto";
import type { ISourceConfig } from "../config/types.ts";
import { getTelegramDialogs } from "./dialogs.ts";
import type { IMonitorSource, ITelegramSource } from "./types.ts";
import type { TAppLogger } from "../utils/logger.ts";

function nonEmptyString(value: string | null | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, "").toLowerCase();
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/** @internal exported for tests */
export function findConfiguredDialog(
  config: ISourceConfig,
  dialogs: ITelegramSource[],
): ITelegramSource | undefined {
  const id = nonEmptyString(config.id);
  if (id !== undefined) {
    const byId = dialogs.find((dialog) => dialog.id === id);
    if (byId !== undefined) {
      return byId;
    }
  }

  const configUsername = nonEmptyString(config.username);
  if (configUsername !== undefined) {
    const username = normalizeUsername(configUsername);
    return dialogs.find((dialog) => {
      const dialogUsername = nonEmptyString(dialog.username);
      return dialogUsername !== undefined && normalizeUsername(dialogUsername) === username;
    });
  }

  const name = nonEmptyString(config.name);
  if (name !== undefined) {
    const normalizedName = normalizeTitle(name);
    return dialogs.find((dialog) => normalizeTitle(dialog.title) === normalizedName);
  }

  return undefined;
}

function toMonitorSource(
  config: ISourceConfig,
  dialog: ITelegramSource | undefined,
): IMonitorSource | undefined {
  if (dialog !== undefined) {
    const label = nonEmptyString(config.name) ?? dialog.title;
    return {
      id: dialog.id,
      label,
      username: nonEmptyString(dialog.username),
      type: dialog.type,
    };
  }

  const id = nonEmptyString(config.id);
  if (id !== undefined) {
    const label = nonEmptyString(config.name) ?? id;
    return {
      id,
      label,
      type: "channel",
    };
  }

  return undefined;
}

export async function resolveMonitorSources(
  client: TelegramClient,
  configured: ISourceConfig[],
  log: TAppLogger,
): Promise<IMonitorSource[]> {
  const dialogs = await getTelegramDialogs(client);
  const resolved: IMonitorSource[] = [];

  for (const sourceConfig of configured) {
    const dialog = findConfiguredDialog(sourceConfig, dialogs);
    const monitorSource = toMonitorSource(sourceConfig, dialog);

    if (monitorSource === undefined) {
      log.warn(
        `Skipped source config (no match): ${JSON.stringify({
          id: sourceConfig.id,
          username: sourceConfig.username,
          name: sourceConfig.name,
        })}`,
      );
      continue;
    }

    if (dialog === undefined) {
      log.warn(
        `Source ${monitorSource.label} uses id ${monitorSource.id} but dialog was not found in account list`,
      );
    }

    resolved.push(monitorSource);
  }

  return resolved;
}
