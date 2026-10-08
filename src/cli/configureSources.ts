import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "../../config/config.ts";
import type { ISourceConfig } from "../config/types.ts";
import { sanitizeSourceConfig, writeAppConfig } from "../config/writeConfig.ts";
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
import type { ITelegramSource } from "../telegram/types.ts";
import { createLogger } from "../utils/logger.ts";

const log = createLogger("CLI");

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function isDialogAlreadyConfigured(
  dialog: ITelegramSource,
  sources: ISourceConfig[],
): boolean {
  const byId = sources.some(
    (source) => source.id !== undefined && source.id.trim() === dialog.id,
  );
  if (byId) {
    return true;
  }

  return sources.some(
    (source) =>
      source.name !== undefined &&
      normalizeTitle(source.name) === normalizeTitle(dialog.title),
  );
}

function toSourceConfig(dialog: ITelegramSource): ISourceConfig {
  return {
    id: dialog.id,
    name: dialog.title,
    ...(dialog.username !== undefined ? { username: dialog.username } : {}),
  };
}

async function askAddDialog(
  rl: ReturnType<typeof createInterface>,
  dialog: ITelegramSource,
  index: number,
  total: number,
): Promise<boolean> {
  const usernamePart =
    dialog.username !== undefined ? ` @${dialog.username}` : "";
  const line = `[${index}/${total}] ${dialog.type} | ${dialog.title}${usernamePart} | ${dialog.id}`;
  console.log(line);

  const answer = (await rl.question("Add to sources? Enter=yes, n=no: ")).trim();
  return answer !== "n";
}

async function main(): Promise<void> {
  const env = loadTelegramEnv();
  const client = createTelegramClient(env);
  const rl = createInterface({ input, output });

  try {
    await connectAuthorizedUser(client);
    log.info("Fetching dialogs...");

    const dialogs = await getTelegramDialogs(client, {
      excludeTitles: [config.notifications.targetTitle],
    });

    if (dialogs.length === 0) {
      log.warn("No groups or channels found.");
      return;
    }

    console.log("\n" + formatTelegramDialogsTable(dialogs) + "\n");

    const pending = dialogs.filter(
      (dialog) => !isDialogAlreadyConfigured(dialog, config.telegram.sources),
    );

    log.info(
      `Already configured: ${config.telegram.sources.length}, new candidates: ${pending.length}`,
    );

    if (pending.length === 0) {
      log.info("Nothing to add. All dialogs are already in config.ts.");
      return;
    }

    const added: ISourceConfig[] = [];

    for (let i = 0; i < pending.length; i += 1) {
      const dialog = pending[i];
      const shouldAdd = await askAddDialog(rl, dialog, i + 1, pending.length);
      if (shouldAdd) {
        added.push(toSourceConfig(dialog));
      }
    }

    if (added.length === 0) {
      log.info("No sources selected. config.ts was not changed.");
      return;
    }

    const nextConfig = {
      ...config,
      telegram: {
        ...config.telegram,
        sources: [...config.telegram.sources, ...added].map(sanitizeSourceConfig),
      },
    };

    await writeAppConfig(nextConfig);
    log.info(`Added ${added.length} source(s) to config/config.ts`);
  } finally {
    rl.close();
    await disconnectTelegramClient(client);
  }
}

main().catch((error: unknown) => {
  createLogger("CLI").error("Failed to configure sources", error);
  process.exitCode = 1;
});
