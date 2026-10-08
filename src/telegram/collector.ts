import { NewMessage } from "teleproto/events";
import type { NewMessageEvent } from "teleproto/events";
import type { TelegramClient } from "teleproto";
import type { Unsubscribe } from "teleproto/client/updates/composer";
import type { ISourceConfig } from "../config/types.ts";
import { createLogger, type TAppLogger } from "../utils/logger.ts";
import { tryClaimMessageForProcessing } from "../messages/processedMessage.ts";
import { buildTelegramMessageUrl } from "./messageUrl.ts";
import { resolveMonitorSources } from "./monitorSources.ts";
import type { IMonitorSource, IRawTelegramMessage, TRawMessageHandler } from "./types.ts";

function extractRawText(message: NewMessageEvent["message"]): string {
  const text = message.message;
  if (typeof text === "string" && text.trim() !== "") {
    return text;
  }
  return "";
}

export interface ICollectorOptions {
  isActive?: () => boolean;
}

export async function startCollector(
  client: TelegramClient,
  sourceConfigs: ISourceConfig[],
  onMessage: TRawMessageHandler,
  log: TAppLogger,
  options: ICollectorOptions = {},
): Promise<Unsubscribe> {
  const sources = await resolveMonitorSources(client, sourceConfigs, log);

  if (sources.length === 0) {
    throw new Error("No Telegram sources resolved from config. Check config/config.ts.");
  }

  const sourceById = new Map<string, IMonitorSource>(
    sources.map((source) => [source.id, source]),
  );

  log.info(`Monitoring ${sources.length} source(s)`);
  const dbLog = createLogger("Database");

  const chats = sources.map((source) => source.id);

  const unsubscribe = client.updates.on(
    new NewMessage({ incoming: true }),
    async (event: NewMessageEvent) => {
      if (options.isActive !== undefined && !options.isActive()) {
        return;
      }

      const chatId = event.chatId;
      if (chatId === undefined) {
        return;
      }

      const sourceId = await client.getPeerId(chatId, true);
      const source = sourceById.get(sourceId);
      if (source === undefined) {
        return;
      }

      const messageId = event.message.id;
      const rawText = extractRawText(event.message);
      if (rawText === "") {
        return;
      }

      const rawMessage: IRawTelegramMessage = {
        sourceId,
        messageId,
        rawText,
        date: new Date(event.message.date * 1000),
        telegramMessageUrl: buildTelegramMessageUrl(source, messageId),
      };

      log.info(`${source.label} / ${messageId}`);

      try {
        const claimed = await tryClaimMessageForProcessing(sourceId, messageId);
        if (!claimed) {
          dbLog.info(`Message already processed: ${source.label} / ${messageId}`);
          return;
        }

        await onMessage(rawMessage);
      } catch (error: unknown) {
        log.error(`Failed to handle message ${source.label} / ${messageId}`, error);
      }
    },
    { chats },
  );

  client.updates.catch((error: Error) => {
    log.error("Telegram updates pipeline error", error);
  });

  return unsubscribe;
}
