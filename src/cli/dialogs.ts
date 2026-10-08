import { config } from "../../config/config.ts";
import { loadTelegramEnv } from "../config/env.ts";
import {
  connectAuthorizedUser,
  createTelegramClient,
  disconnectTelegramClient,
} from "../telegram/client.ts";
import {
  formatTelegramDialogsTable,
  getTelegramDialogs,
} from "../telegram/dialogs.ts";
import { createLogger } from "../utils/logger.ts";

const log = createLogger("Telegram");

async function main(): Promise<void> {
  const env = loadTelegramEnv();
  const client = createTelegramClient(env);

  try {
    await connectAuthorizedUser(client);
    log.info("Fetching dialogs...");

    const sources = await getTelegramDialogs(client, {
      excludeTitles: [config.notifications.targetTitle],
    });

    console.log(formatTelegramDialogsTable(sources));
    log.info(`Listed ${sources.length} group/channel source(s)`);
  } finally {
    await disconnectTelegramClient(client);
  }
}

main().catch((error: unknown) => {
  createLogger("CLI").error("Failed to list dialogs", error);
  process.exitCode = 1;
});
