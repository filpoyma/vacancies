import { loadTelegramEnv } from "../config/env.ts";
import {
  createTelegramClient,
  disconnectTelegramClient,
  loginUserClient,
} from "../telegram/client.ts";
import { createAuthPrompts } from "../telegram/authPrompts.ts";
import { createLogger } from "../utils/logger.ts";

const log = createLogger("Telegram");

async function main(): Promise<void> {
  const env = loadTelegramEnv();
  const client = createTelegramClient(env);
  const prompts = createAuthPrompts();

  try {
    await loginUserClient(client, prompts, log);

    const me = await client.getMe();
    const displayName =
      me.username !== undefined && me.username !== ""
        ? `@${me.username}`
        : [me.firstName, me.lastName].filter(Boolean).join(" ") || "user";

    log.info(`Authorized as ${displayName}`);
    log.info("Session saved locally in data/session/ (not committed to git)");
  } finally {
    prompts.close();
    await disconnectTelegramClient(client);
  }
}

main().catch((error: unknown) => {
  createLogger("CLI").error("Login failed", error);
  process.exitCode = 1;
});
