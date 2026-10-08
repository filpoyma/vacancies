import ProcessedMessage from "../models/ProcessedMessage.ts";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  );
}

/**
 * Marks a Telegram message as processed. Returns false if it was already claimed.
 */
export async function tryClaimMessageForProcessing(
  sourceId: string,
  telegramMessageId: number,
): Promise<boolean> {
  try {
    await ProcessedMessage.create({
      sourceId,
      telegramMessageId,
    });
    return true;
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return false;
    }
    throw error;
  }
}
