import { createInterface, type Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { SentCodeInfo } from "teleproto/client/auth";

export interface IAuthPrompts {
  phoneNumber(): Promise<string>;
  phoneCode(isCodeViaApp?: boolean, info?: SentCodeInfo): Promise<string>;
  password(hint?: string): Promise<string>;
  emailAddress(): Promise<string>;
  emailCode(): Promise<string>;
  close(): void;
}

export function createAuthPrompts(): IAuthPrompts {
  const rl: Interface = createInterface({ input, output });

  return {
    async phoneNumber(): Promise<string> {
      const value = await rl.question(
        "Phone number (international format, e.g. +79001234567): ",
      );
      return value.trim();
    },

    async phoneCode(isCodeViaApp?: boolean, info?: SentCodeInfo): Promise<string> {
      const delivery = info?.type ?? (isCodeViaApp ? "app" : "sms");
      const value = await rl.question(`Login code (delivered via ${delivery}): `);
      return value.trim();
    },

    async password(hint?: string): Promise<string> {
      if (hint) {
        console.log(`2FA hint: ${hint}`);
      }
      const value = await rl.question("2FA password: ");
      return value.trim();
    },

    async emailAddress(): Promise<string> {
      const value = await rl.question("Login email: ");
      return value.trim();
    },

    async emailCode(): Promise<string> {
      const value = await rl.question("Email verification code: ");
      return value.trim();
    },

    close(): void {
      rl.close();
    },
  };
}
