import type { TelegramClient } from "teleproto";
import type { ISourceConfig } from "../config/types.ts";
import { getTelegramDialogs } from "./dialogs.ts";
import type { IMonitorSource, ITelegramSource } from "./types.ts";
import type { TAppLogger } from "../utils/logger.ts";

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, "").toLowerCase();
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function findConfiguredDialog(
  config: ISourceConfig,
  dialogs: ITelegramSource[],
): ITelegramSource | undefined {
  if (config.id !== undefined && config.id.trim() !== "") {
    const id = config.id.trim();
    const byId = dialogs.find((dialog) => dialog.id === id);
    if (byId !== undefined) {
      return byId;
    }
  }

  if (config.username !== undefined && config.username.trim() !== "") {
    const username = normalizeUsername(config.username);
    return dialogs.find(
      (dialog) =>
        dialog.username !== undefined &&
        normalizeUsername(dialog.username) === username,
    );
  }

  if (config.name !== undefined && config.name.trim() !== "") {
    const name = normalizeTitle(config.name);
    return dialogs.find((dialog) => normalizeTitle(dialog.title) === name);
  }

  return undefined;
}

function toMonitorSource(
  config: ISourceConfig,
  dialog: ITelegramSource | undefined,
): IMonitorSource | undefined {
  if (dialog !== undefined) {
    return {
      id: dialog.id,
      label: config.name?.trim() || dialog.title,
      username: dialog.username,
      type: dialog.type,
    };
  }

  if (config.id !== undefined && config.id.trim() !== "") {
    return {
      id: config.id.trim(),
      label: config.name?.trim() || config.id.trim(),
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
