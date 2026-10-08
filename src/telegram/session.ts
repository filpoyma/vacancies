import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { StoreSession } from "teleproto/sessions";
import { getProjectRoot } from "../utils/projectRoot.ts";

const SESSION_DIR_NAME = "telegram";

export function getTelegramSessionPath(): string {
  const sessionRoot = resolve(getProjectRoot(), "data/session");
  mkdirSync(sessionRoot, { recursive: true });
  return resolve(sessionRoot, SESSION_DIR_NAME);
}

export function createTelegramSession(): StoreSession {
  return new StoreSession(getTelegramSessionPath());
}
