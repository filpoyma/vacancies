import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let cachedProjectRoot: string | undefined;

function findDirectoryWithPackageJson(startDir: string): string {
  let dir = resolve(startDir);

  while (true) {
    if (existsSync(resolve(dir, "package.json"))) {
      return dir;
    }

    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "Could not find project root: no package.json in this directory or any parent.",
      );
    }
    dir = parent;
  }
}

export function getProjectRoot(): string {
  if (cachedProjectRoot === undefined) {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    cachedProjectRoot = findDirectoryWithPackageJson(moduleDir);
  }

  return cachedProjectRoot;
}
