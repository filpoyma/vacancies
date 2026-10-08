import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function getProjectRoot(): string {
  return resolve(fileURLToPath(new URL("../..", import.meta.url)));
}
