import { TelegramClient } from "teleproto";
import type { UserAuthParams } from "teleproto/client/auth";
import type { ITelegramEnv } from "../config/env.ts";
import type { TAppLogger } from "../utils/logger.ts";
import type { IAuthPrompts } from "./authPrompts.ts";
import { createTelegramSession } from "./session.ts";

export function createTelegramClient(env: ITelegramEnv): TelegramClient {
  const session = createTelegramSession();
  return new TelegramClient(session, env.telegramApiId, env.telegramApiHash, {
    connectionRetries: 5,
  });
}

export function buildUserAuthParams(
  prompts: IAuthPrompts,
  log: TAppLogger,
): UserAuthParams {
  return {
    phoneNumber: () => prompts.phoneNumber(),
    phoneCode: (isCodeViaApp, info) => prompts.phoneCode(isCodeViaApp, info),
    password: (hint) => prompts.password(hint),
    emailAddress: () => prompts.emailAddress(),
    emailVerification: async () => ({
      type: "code",
      code: await prompts.emailCode(),
    }),
    onError: (error: Error) => {
      log.error("Telegram authorization error", error);
    },
  };
}

/** Interactive login/sign-up; persists session under data/session/. */
export async function loginUserClient(
  client: TelegramClient,
  prompts: IAuthPrompts,
  log: TAppLogger,
): Promise<void> {
  log.info("Connecting to Telegram...");
  await client.start(buildUserAuthParams(prompts, log));
  log.info("Connected");
}

/** Connect using saved session; fails if not authorized. */
export async function connectAuthorizedUser(client: TelegramClient): Promise<void> {
  await client.connect();
  const authorized = await client.checkAuthorization();
  if (!authorized) {
    throw new Error(
      "Telegram session is not authorized. Run `npm run telegram:login` first.",
    );
  }
}

export async function disconnectTelegramClient(client: TelegramClient): Promise<void> {
  await client.disconnect();
}
