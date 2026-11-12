import { config } from "../../config/config.ts";
import { loadApplyAssets } from "../apply/loadApplyAssets.ts";
import { sendEmailApply } from "../apply/sendEmailApply.ts";
import { sendTelegramApply } from "../apply/sendTelegramApply.ts";
import type { TApplyProfileId } from "../config/types.ts";
import { loadEnv } from "../config/env.ts";
import {
  connectAuthorizedUser,
  createTelegramClient,
  disconnectTelegramClient,
} from "../telegram/client.ts";
import { createLogger } from "../utils/logger.ts";

const log = createLogger("ApplySmoke");

const DEFAULT_SMOKE_TELEGRAM = "@Romantra";
const DEFAULT_SMOKE_EMAIL = "poymaza@gmail.com";

const SMOKE_TEST_BANNER =
  "[[SMOKE TEST — vacancy-monitor]]\n" +
  "Это проверка доставки отклика. Сообщение отправлено вручную через apply:smoke.\n\n";

interface ISmokeOptions {
  telegramOnly: boolean;
  emailOnly: boolean;
  profile: TApplyProfileId;
  telegramRecipient: string;
  emailRecipient: string;
}

function parseArgs(argv: string[]): ISmokeOptions {
  const options: ISmokeOptions = {
    telegramOnly: false,
    emailOnly: false,
    profile: "frontend",
    telegramRecipient:
      process.env.APPLY_SMOKE_TELEGRAM?.trim() || DEFAULT_SMOKE_TELEGRAM,
    emailRecipient:
      process.env.APPLY_SMOKE_EMAIL?.trim() || DEFAULT_SMOKE_EMAIL,
  };

  for (const arg of argv) {
    if (arg === "--telegram-only") {
      options.telegramOnly = true;
    } else if (arg === "--email-only") {
      options.emailOnly = true;
    } else if (arg === "--profile=fullstack" || arg === "--profile") {
      if (arg === "--profile=fullstack") {
        options.profile = "fullstack";
      }
    } else if (arg.startsWith("--profile=")) {
      const value = arg.slice("--profile=".length);
      if (value === "frontend" || value === "fullstack") {
        options.profile = value;
      } else {
        throw new Error(`Unknown profile: ${value}. Use frontend or fullstack.`);
      }
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (options.telegramOnly && options.emailOnly) {
    throw new Error("Use only one of --telegram-only or --email-only.");
  }

  return options;
}

function printHelp(): void {
  log.info(`Usage: pnpm apply:smoke [options]

Sends a test application to Telegram (@Romantra) and email (poymaza@gmail.com)
using resume PDF and cover letter from config.apply.

Options:
  --telegram-only     Skip email
  --email-only        Skip Telegram (needs GMAIL_APP_PASSWORD)
  --profile=frontend  Resume profile (default frontend)
  --profile=fullstack

Env overrides:
  APPLY_SMOKE_TELEGRAM  default ${DEFAULT_SMOKE_TELEGRAM}
  APPLY_SMOKE_EMAIL     default ${DEFAULT_SMOKE_EMAIL}
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const runTelegram = !options.emailOnly;
  const runEmail = !options.telegramOnly;

  if (!config.apply.enabled) {
    throw new Error("config.apply.enabled is false — enable apply in config/config.ts");
  }

  const env = loadEnv();
  const assets = await loadApplyAssets(config.apply);
  const resumePath = assets.resumePathByProfile[options.profile];
  const coverLetter = `${SMOKE_TEST_BANNER}${assets.coverLetterText}`;

  log.info(`Profile: ${options.profile}`);
  log.info(`Resume: ${resumePath}`);

  let sentCount = 0;

  if (runTelegram) {
    if (!env.applySend.telegramSendEnabled) {
      if (options.telegramOnly) {
        throw new Error(
          "Telegram smoke test blocked: TELEGRAM_SEND_ENABLE=false",
        );
      }
      log.warn(
        "Skipping Telegram smoke test (TELEGRAM_SEND_ENABLE=false)",
      );
    } else {
      log.info(`Telegram → ${options.telegramRecipient}`);
      const client = createTelegramClient(env);
      try {
        await connectAuthorizedUser(client);
        await sendTelegramApply(
          client,
          options.telegramRecipient,
          coverLetter,
          resumePath,
          `[SMOKE TEST] vacancy-monitor (${options.profile})`,
        );
        log.info("Telegram smoke test sent");
        sentCount += 1;
      } finally {
        await disconnectTelegramClient(client);
      }
    }
  }

  if (runEmail) {
    if (!env.applySend.emailSendEnabled) {
      if (options.emailOnly) {
        throw new Error("Email smoke test blocked: EMAIL_SEND_ENABLE=false");
      }
      log.warn("Skipping Email smoke test (EMAIL_SEND_ENABLE=false)");
    } else if (!env.gmail.enabled) {
      if (options.emailOnly) {
        throw new Error(
          "Gmail SMTP not configured. Set GMAIL_APP_PASSWORD in .env for email smoke test.",
        );
      }
      log.warn(
        "Skipping Email smoke test (GMAIL_APP_PASSWORD not set)",
      );
    } else {
      log.info(`Email → ${options.emailRecipient}`);
      const subject = `[SMOKE TEST] vacancy-monitor apply (${options.profile})`;
      await sendEmailApply(
        env.gmail,
        options.emailRecipient,
        subject,
        coverLetter,
        resumePath,
      );
      log.info("Email smoke test sent");
      sentCount += 1;
    }
  }

  if (sentCount === 0) {
    throw new Error(
      "Smoke test sent nothing — enable TELEGRAM_SEND_ENABLE and/or EMAIL_SEND_ENABLE (and Gmail), or use --telegram-only / --email-only",
    );
  }

  log.info("Smoke test finished");
}

main().catch((error: unknown) => {
  log.error("Smoke test failed", error);
  process.exitCode = 1;
});
