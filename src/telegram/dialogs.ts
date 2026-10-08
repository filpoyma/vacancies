import { Api } from "teleproto";
import type { TelegramClient } from "teleproto";
import type { Entity } from "teleproto/define";
import type { TTelegramDialogType } from "../config/types.ts";
import type { IGetTelegramDialogsOptions, ITelegramSource } from "./types.ts";

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function shouldExcludeTitle(title: string, excludeTitles: string[]): boolean {
  const normalized = normalizeTitle(title);
  return excludeTitles.some((item) => normalizeTitle(item) === normalized);
}

function resolveDialogType(
  dialog: { isUser: boolean; isGroup: boolean; isChannel: boolean; isCommunity: boolean },
  entity?: Entity,
): TTelegramDialogType | null {
  if (dialog.isCommunity || dialog.isUser) {
    return null;
  }

  if (entity instanceof Api.User) {
    return null;
  }

  if (dialog.isChannel) {
    if (entity instanceof Api.Channel) {
      return entity.megagroup ? "supergroup" : "channel";
    }
    return "channel";
  }

  if (dialog.isGroup) {
    return "group";
  }

  return null;
}

function resolveUsername(entity?: Entity): string | undefined {
  if (entity instanceof Api.Channel) {
    const username = entity.username;
    if (username !== undefined && username !== "") {
      return username;
    }
  }
  return undefined;
}

function resolveTitle(
  dialog: { title?: string; name?: string },
  entity?: Entity,
): string {
  if (dialog.title !== undefined && dialog.title !== "") {
    return dialog.title;
  }
  if (dialog.name !== undefined && dialog.name !== "") {
    return dialog.name;
  }
  if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
    return entity.title;
  }
  return "Untitled";
}

export async function getTelegramDialogs(
  client: TelegramClient,
  options: IGetTelegramDialogsOptions = {},
): Promise<ITelegramSource[]> {
  const excludeTitles = options.excludeTitles ?? [];
  const dialogs = await client.getDialogs({});
  const sources: ITelegramSource[] = [];

  for (const dialog of dialogs) {
    const entity = dialog.entity;
    const type = resolveDialogType(dialog, entity);
    if (type === null) {
      continue;
    }

    const title = resolveTitle(dialog, entity);
    if (shouldExcludeTitle(title, excludeTitles)) {
      continue;
    }

    const peer = entity ?? dialog.inputEntity;
    const id = await client.getPeerId(peer, true);

    const source: ITelegramSource = {
      id,
      title,
      type,
    };

    const username = resolveUsername(entity);
    if (username !== undefined) {
      source.username = username;
    }

    sources.push(source);
  }

  sources.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  return sources;
}

const ID_COLUMN_WIDTH = 26;
const TYPE_COLUMN_WIDTH = 14;

export function formatTelegramDialogsTable(sources: ITelegramSource[]): string {
  const header = `${"ID".padEnd(ID_COLUMN_WIDTH)}${"TYPE".padEnd(TYPE_COLUMN_WIDTH)}TITLE`;
  const separator = "-".repeat(header.length);
  const rows = sources.map((source) => {
    const id = source.id.padEnd(ID_COLUMN_WIDTH);
    const type = source.type.padEnd(TYPE_COLUMN_WIDTH);
    return `${id}${type}${source.title}`;
  });

  return [header, separator, ...rows].join("\n");
}
