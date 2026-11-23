import { hash, verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { hashToken } from "./auth";
import { prisma } from "./db";
import { isUniqueViolation, QueueError } from "./errors";

export const CUSTOMER_SESSION_COOKIE = "customer_session";
export const CUSTOMER_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const CUSTOMER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

const EXTEND_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function signUpCustomer(
  email: string,
  password: string,
  now = new Date(),
) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new QueueError("INVALID_EMAIL", 400);
  }
  if (password.length < 8) {
    throw new QueueError("WEAK_PASSWORD", 400);
  }

  const passwordHash = await hash(password);
  let customer;
  try {
    customer = await prisma.customerUser.create({
      data: { email: normalized, passwordHash },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new QueueError("EMAIL_TAKEN", 409);
    throw error;
  }

  return { customer, ...(await createCustomerSession(customer.id, now)) };
}

export async function authenticateCustomer(email: string, password: string) {
  const customer = await prisma.customerUser.findUnique({
    where: { email: normalizeEmail(email) },
  });
  if (!customer) return null;
  try {
    return (await verify(customer.passwordHash, password)) ? customer : null;
  } catch {
    return null;
  }
}

export async function createCustomerSession(
  customerUserId: string,
  now = new Date(),
) {
  const token = randomBytes(32).toString("base64url");
  const session = await prisma.customerSession.create({
    data: {
      tokenHash: hashToken(token),
      customerUserId,
      expiresAt: new Date(now.getTime() + CUSTOMER_SESSION_TTL_SECONDS * 1000),
    },
  });
  return { token, session };
}

export async function resolveCustomerSession(
  token: string | undefined,
  now = new Date(),
) {
  if (!token) return null;
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { customer: true },
  });
  if (!session || session.expiresAt.getTime() <= now.getTime()) return null;

  if (session.expiresAt.getTime() - now.getTime() < EXTEND_THRESHOLD_MS) {
    const expiresAt = new Date(
      now.getTime() + CUSTOMER_SESSION_TTL_SECONDS * 1000,
    );
    await prisma.customerSession.update({
      where: { id: session.id },
      data: { expiresAt },
    });
    return { ...session, expiresAt };
  }
  return session;
}

export async function destroyCustomerSession(token: string | undefined) {
  if (!token) return;
  await prisma.customerSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}
