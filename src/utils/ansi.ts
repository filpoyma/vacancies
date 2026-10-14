const ANSI_GREEN = "\x1b[32m";
const ANSI_RED = "\x1b[31m";
const ANSI_RESET = "\x1b[0m";

export function shouldUseAnsiColors(): boolean {
  return process.env.NO_COLOR === undefined && process.stdout.isTTY === true;
}

export function colorGreen(text: string): string {
  if (!shouldUseAnsiColors()) {
    return text;
  }
  return `${ANSI_GREEN}${text}${ANSI_RESET}`;
}

export function colorRed(text: string): string {
  if (!shouldUseAnsiColors()) {
    return text;
  }
  return `${ANSI_RED}${text}${ANSI_RESET}`;
}
