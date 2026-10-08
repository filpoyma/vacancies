import { createHash } from "node:crypto";
import type { HydratedDocument } from "mongoose";
import Vacancy, { type TVacancy } from "../models/Vacancy.ts";
import type { IRawTelegramMessage } from "../telegram/types.ts";
import { buildCoreDescription, normalizeSalary, normalizeText } from "./normalizer.ts";
import type { IParsedVacancy } from "./types.ts";

export interface IUpsertVacancyResult {
  vacancy: HydratedDocument<TVacancy>;
  isNew: boolean;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: number }).code === 11000
  );
}

function stripChannelFooters(description: string): string {
  let text = description;

  const inlineFooterPatterns = [
    /\s+posted via\b.+$/i,
    /\s+subscribe\s+@?\S+$/i,
    /\s+follow\s+@?\S+$/i,
  ];

  for (const pattern of inlineFooterPatterns) {
    text = text.replace(pattern, "");
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) {
        return false;
      }
      const lower = line.toLowerCase();
      return !(
        lower.startsWith("posted ") ||
        lower.startsWith("subscribe ") ||
        lower.startsWith("follow ") ||
        lower.includes("posted via") ||
        lower.startsWith("via @")
      );
    })
    .join("\n");
}

function formatSalaryKey(parsed: IParsedVacancy): string {
  const salary = normalizeSalary(parsed.salary);
  if (salary === undefined) {
    return "";
  }
  return `${salary.min ?? ""}:${salary.max ?? ""}:${salary.currency ?? ""}`;
}

export function buildFingerprint(parsed: IParsedVacancy): string {
  const title = normalizeText(parsed.title ?? "");
  const company = normalizeText(parsed.company ?? "");
  const salaryKey = formatSalaryKey(parsed);
  const core = buildCoreDescription(stripChannelFooters(parsed.description));

  const payload = [title, company, salaryKey, core].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function buildVacancyFields(
  parsed: IParsedVacancy,
  rawMessage: IRawTelegramMessage,
  fingerprint: string,
) {
  return {
    fingerprint,
    sourceIds: [rawMessage.sourceId],
    telegramMessages: [
      {
        sourceId: rawMessage.sourceId,
        messageId: rawMessage.messageId,
      },
    ],
    title: parsed.title,
    company: parsed.company,
    description: parsed.description,
    salary: parsed.salary,
    location: parsed.location,
    remote: parsed.remote,
    skills: parsed.skills,
    experience: parsed.experience,
    contact: parsed.contact,
    url: parsed.url ?? rawMessage.telegramMessageUrl,
    publishedAt: rawMessage.date,
  };
}

async function mergeDuplicateSource(
  fingerprint: string,
  rawMessage: IRawTelegramMessage,
): Promise<HydratedDocument<TVacancy>> {
  await Vacancy.updateOne(
    { fingerprint },
    {
      $addToSet: {
        sourceIds: rawMessage.sourceId,
        telegramMessages: {
          sourceId: rawMessage.sourceId,
          messageId: rawMessage.messageId,
        },
      },
    },
  );

  const vacancy = await Vacancy.findOne({ fingerprint });
  if (vacancy === null) {
    throw new Error("Vacancy merge failed: document not found after update.");
  }

  return vacancy;
}

export async function upsertVacancy(
  parsed: IParsedVacancy,
  rawMessage: IRawTelegramMessage,
): Promise<IUpsertVacancyResult> {
  const fingerprint = buildFingerprint(parsed);

  const existing = await Vacancy.findOne({ fingerprint });
  if (existing !== null) {
    const vacancy = await mergeDuplicateSource(fingerprint, rawMessage);
    return { vacancy, isNew: false };
  }

  try {
    const vacancy = await Vacancy.create(
      buildVacancyFields(parsed, rawMessage, fingerprint),
    );
    return { vacancy, isNew: true };
  } catch (error: unknown) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const vacancy = await mergeDuplicateSource(fingerprint, rawMessage);
    return { vacancy, isNew: false };
  }
}
