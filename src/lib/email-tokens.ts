import { randomBytes } from "node:crypto";
import { hashToken } from "./auth";
import { prisma } from "./db";
import { appUrl, sendMail } from "./mailer";

const TTL_MS = {
  VERIFY: 24 * 60 * 60 * 1000,
  RESET: 60 * 60 * 1000,
} as const;

export type EmailTokenPurpose = keyof typeof TTL_MS;

export async function createEmailToken(
  customerUserId: string,
  purpose: EmailTokenPurpose,
  now = new Date(),
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + TTL_MS[purpose]);
  await prisma.emailToken.create({
    data: {
      tokenHash: hashToken(token),
      customerUserId,
      purpose,
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export async function consumeEmailToken(
  token: string,
  purpose: EmailTokenPurpose,
  now = new Date(),
) {
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (
    !record ||
    record.purpose !== purpose ||
    record.usedAt ||
    record.expiresAt.getTime() <= now.getTime()
  ) {
    return null;
  }

  const consumed = await prisma.emailToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return consumed.count === 1 ? record.customerUserId : null;
}

export async function sendVerificationEmail(
  customer: { id: string; email: string },
  now = new Date(),
) {
  const { token } = await createEmailToken(customer.id, "VERIFY", now);
  const link = `${appUrl()}/account/verify?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: customer.email,
    subject: "Verify your Antrian email",
    text: `Verify your email to secure your queue tickets:\n\n${link}\n\nThis link expires in 24 hours.`,
  });
  return token;
}

export async function sendPasswordResetEmail(
  customer: { id: string; email: string },
  now = new Date(),
) {
  const { token } = await createEmailToken(customer.id, "RESET", now);
  const link = `${appUrl()}/account/reset?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: customer.email,
    subject: "Reset your Antrian password",
    text: `Reset your password here:\n\n${link}\n\nThis link expires in 1 hour. If you did not request it, ignore this email.`,
  });
  return token;
}
