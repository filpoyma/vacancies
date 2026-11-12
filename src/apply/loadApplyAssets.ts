import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IApplyConfig } from "../config/types.ts";
import { getProjectRoot } from "../utils/projectRoot.ts";
import type { IResolvedApplyAssets } from "./types.ts";

async function assertReadableFile(absolutePath: string): Promise<void> {
  await access(absolutePath);
}

export async function loadApplyAssets(config: IApplyConfig): Promise<IResolvedApplyAssets> {
  const root = getProjectRoot();
  const coverLetterPath = resolve(root, config.coverLetterPath);
  const frontendResume = resolve(root, config.profiles.frontend.resumePath);
  const fullstackResume = resolve(root, config.profiles.fullstack.resumePath);

  await assertReadableFile(coverLetterPath);
  await assertReadableFile(frontendResume);
  await assertReadableFile(fullstackResume);

  const coverLetterText = (await readFile(coverLetterPath, "utf8")).trim();

  return {
    coverLetterText,
    resumePathByProfile: {
      frontend: frontendResume,
      fullstack: fullstackResume,
    },
  };
}
