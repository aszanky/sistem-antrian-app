import { verify } from "@node-rs/argon2";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";

export const SESSION_COOKIE = "staff_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticate(email: string, password: string) {
  const staff = await prisma.staffUser.findUnique({
    where: { email },
    include: { business: true },
  });
  if (!staff) return null;
  let valid = false;
  try {
    valid = await verify(staff.passwordHash, password);
  } catch {
    return null;
  }
  return valid ? staff : null;
}

export async function createSession(staffUserId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const session = await prisma.staffSession.create({
    data: {
      tokenHash: hashToken(token),
      staffUserId,
      expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
    },
  });
  return { token, session };
}

export async function resolveSession(token: string | undefined, now = new Date()) {
  if (!token) return null;
  const session = await prisma.staffSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { staff: { include: { business: true } }, counter: true },
  });
  if (!session || session.expiresAt.getTime() <= now.getTime()) return null;
  return session;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await prisma.staffSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export type StaffSessionContext = {
  id: string;
  counterId: string | null;
  staffUserId: string;
  staff: { businessId: string };
};
