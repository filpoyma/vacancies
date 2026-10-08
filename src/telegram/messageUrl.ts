export function buildTelegramMessageUrl(
  source: { id: string; username?: string },
  messageId: number,
): string | undefined {
  if (source.username !== undefined && source.username !== "") {
    const username = source.username.replace(/^@/, "");
    return `https://t.me/${username}/${messageId}`;
  }

  if (source.id.startsWith("-100")) {
    const internalId = source.id.slice(4);
    return `https://t.me/c/${internalId}/${messageId}`;
  }

  return undefined;
}
