import nodemailer from "nodemailer";
import { basename } from "node:path";
import type { IGmailEnv } from "../config/env.ts";

export async function sendEmailApply(
  gmail: IGmailEnv,
  to: string,
  subject: string,
  coverLetterText: string,
  resumeAbsolutePath: string,
): Promise<void> {
  if (!gmail.enabled || gmail.appPassword === undefined) {
    throw new Error("Gmail SMTP is not configured (GMAIL_APP_PASSWORD).");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmail.user,
      pass: gmail.appPassword,
    },
  });

  await transporter.sendMail({
    from: gmail.user,
    to,
    subject: subject.trim() === "" ? "Vacancy application" : subject.trim(),
    text: coverLetterText,
    attachments: [
      {
        filename: basename(resumeAbsolutePath),
        path: resumeAbsolutePath,
      },
    ],
  });
}
