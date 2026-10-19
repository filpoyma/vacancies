import { config } from "../../config/config.ts";
import { loadEnv } from "../config/env.ts";
import { connectDatabase, disconnectDatabase } from "../database/connection.ts";
import { resolveNotificationTarget } from "../notifications/telegram.ts";
import {
  connectAuthorizedUser,
  createTelegramClient,
  disconnectTelegramClient,
} from "../telegram/client.ts";
import { startCollector } from "../telegram/collector.ts";
import type { Unsubscribe } from "teleproto/client/updates/composer";
import { createVacancyAnalyzer } from "../vacancy/aiAnalyzer.ts";
import { handleRawMessage } from "../vacancy/handleRawMessage.ts";
import { createLogger } from "../utils/logger.ts";
import type { IShutdownController } from "./shutdown.ts";

const log = createLogger("App");

export interface IMonitorApplication {
  shutdown(signal: string): Promise<void>;
}

export async function startMonitorApplication(
  shutdownController: IShutdownController,
): Promise<IMonitorApplication> {
  const env = loadEnv();

  log.info("Starting Telegram Vacancy Monitor");
  log.info(
    `Config loaded: ${config.telegram.sources.length} source(s), minMatchScore=${config.filters.minMatchScore}`,
  );

  await connectDatabase(env.mongodbUri);

  const telegramClient = createTelegramClient(env);
  await connectAuthorizedUser(telegramClient);

  const me = await telegramClient.getMe();
  const accountLabel =
    me.username !== undefined && me.username !== ""
      ? `@${me.username}`
      : [me.firstName, me.lastName].filter(Boolean).join(" ") || "user";
  createLogger("Telegram").info(`Authorized as ${accountLabel}`);

  const notificationTargetId = await resolveNotificationTarget(
    telegramClient,
    config.notifications.targetTitle,
  );

  const sourceLabelById = new Map(
    config.telegram.sources
      .filter((source) => source.id !== undefined && source.id.trim() !== "")
      .map((source) => [
        source.id!.trim(),
        source.name?.trim() || source.id!.trim(),
      ]),
  );

  const analyzer = createVacancyAnalyzer(
    config.filters,
    config.ai,
    env.openRouter,
    createLogger("AI"),
  );
  const parserLog = createLogger("Parser");

  const messageDeps = {
    analyzer,
    filterRoles: config.filters.roles,
    telegramClient,
    notificationTargetId,
    notificationTargetTitle: config.notifications.targetTitle,
    getSourceLabel(sourceId: string): string {
      return sourceLabelById.get(sourceId) ?? sourceId;
    },
  };

  let stopCollector: Unsubscribe | undefined;
  let acceptingMessages = true;

  stopCollector = await startCollector(
    telegramClient,
    config.telegram.sources,
    async (rawMessage) => {
      if (!acceptingMessages || shutdownController.isShuttingDown()) {
        return;
      }
      await handleRawMessage(rawMessage, parserLog, messageDeps);
    },
    createLogger("Collector"),
    {
      isActive: () => acceptingMessages && !shutdownController.isShuttingDown(),
    },
  );

  log.info("Collector is running");

  return {
    async shutdown(signal: string): Promise<void> {
      if (shutdownController.isShuttingDown()) {
        return;
      }
      shutdownController.beginShutdown();
      acceptingMessages = false;

      log.info(`Received ${signal}, shutting down...`);

      stopCollector?.();
      await disconnectTelegramClient(telegramClient);
      await disconnectDatabase();

      log.info("Shutdown complete");
    },
  };
}
