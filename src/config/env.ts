import dotenv from "dotenv";
import { resolve } from "node:path";
import { getProjectRoot } from "../utils/projectRoot.ts";

dotenv.config({ path: resolve(getProjectRoot(), ".env") });

export interface ITelegramEnv {
  telegramApiId: number;
  telegramApiHash: string;
}

export interface IOpenRouterEnv {
  apiKey?: string;
  model: string;
  enabled: boolean;
}

export interface IEnv extends ITelegramEnv {
  mongodbUri: string;
  openRouter: IOpenRouterEnv;
}

function missingVar(name: string): never {
  throw new Error(
    `Missing required environment variable: ${name}. Copy .env.example to .env and fill in the values.`,
  );
}

function parseTelegramApiId(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    missingVar("TELEGRAM_API_ID");
  }
  const value = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("TELEGRAM_API_ID must be a positive integer.");
  }
  return value;
}

function requireNonEmpty(name: string, raw: string | undefined): string {
  if (raw === undefined || raw.trim() === "") {
    missingVar(name);
  }
  return raw.trim();
}

let cachedTelegramEnv: ITelegramEnv | undefined;
let cachedEnv: IEnv | undefined;

export function loadTelegramEnv(): ITelegramEnv {
  if (cachedTelegramEnv) {
    return cachedTelegramEnv;
  }

  cachedTelegramEnv = {
    telegramApiId: parseTelegramApiId(process.env.TELEGRAM_API_ID),
    telegramApiHash: requireNonEmpty("TELEGRAM_API_HASH", process.env.TELEGRAM_API_HASH),
  };

  return cachedTelegramEnv;
}

export function loadEnv(): IEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    ...loadTelegramEnv(),
    mongodbUri: requireNonEmpty("MONGODB_URI", process.env.MONGODB_URI),
    openRouter: loadOpenRouterEnv(),
  };

  return cachedEnv;
}

const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash";

export function loadOpenRouterEnv(): IOpenRouterEnv {
  const rawKey = process.env.OPENROUTER_API_KEY?.trim();
  const apiKey = rawKey === undefined || rawKey === "" ? undefined : rawKey;
  const rawModel = process.env.OPENROUTER_MODEL?.trim();
  const model =
    rawModel === undefined || rawModel === "" ? DEFAULT_OPENROUTER_MODEL : rawModel;

  return {
    apiKey,
    model,
    enabled: apiKey !== undefined,
  };
}
