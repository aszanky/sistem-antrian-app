import { hash } from "@node-rs/argon2";
import { hashToken } from "./auth";
import {
  authenticateCustomer,
  createCustomerSession,
  normalizeEmail,
  signUpCustomer,
} from "./customer-auth";
import { prisma } from "./db";
import {
  consumeEmailToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./email-tokens";
import { QueueError } from "./errors";
import { formatNumber } from "./time";

export async function registerCustomer(
  email: string,
  password: string,
  now = new Date(),
) {
  const { customer, token } = await signUpCustomer(email, password, now);
  try {
    await sendVerificationEmail(customer, now);
  } catch (error) {
    console.error("verification email failed", error);
  }
  return { customer, sessionToken: token };
}

export async function loginCustomer(
  email: string,
  password: string,
  now = new Date(),
) {
  const customer = await authenticateCustomer(email, password);
  if (!customer) throw new QueueError("INVALID_CREDENTIALS", 401);
  const { token } = await createCustomerSession(customer.id, now);
  return { customer, sessionToken: token };
}

export async function verifyCustomerEmail(token: string, now = new Date()) {
  const customerId = await consumeEmailToken(token, "VERIFY", now);
  if (!customerId) return false;
  await prisma.customerUser.update({
    where: { id: customerId },
    data: { emailVerifiedAt: now },
  });
  return true;
}

export async function resendVerification(
  customer: { id: string; email: string },
  now = new Date(),
) {
  await sendVerificationEmail(customer, now);
}

export async function requestPasswordReset(email: string, now = new Date()) {
  const customer = await prisma.customerUser.findUnique({
    where: { email: normalizeEmail(email) },
  });
  if (!customer) return;
  try {
    await sendPasswordResetEmail(customer, now);
  } catch (error) {
    console.error("password reset email failed", error);
  }
}

export async function resetPassword(
  token: string,
  password: string,
  now = new Date(),
) {
  if (password.length < 8) throw new QueueError("WEAK_PASSWORD", 400);
  const customerId = await consumeEmailToken(token, "RESET", now);
  if (!customerId) throw new QueueError("INVALID_TOKEN", 400);

  const passwordHash = await hash(password);
  await prisma.$transaction([
    prisma.customerUser.update({
      where: { id: customerId },
      data: { passwordHash },
    }),
    prisma.customerSession.deleteMany({ where: { customerUserId: customerId } }),
  ]);
}

type OverviewRow = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  tickets: {
    id: string;
    seq: number;
    status: "WAITING" | "CALLED" | "SERVED";
    expired: boolean;
    businessName: string;
  }[];
};

export type AccountOverview = {
  customer: { id: string; email: string; emailVerified: boolean };
  tickets: {
    id: string;
    number: string;
    status: "WAITING" | "CALLED" | "SERVED" | "EXPIRED";
    businessName: string;
  }[];
};

export async function getAccountOverview(
  sessionToken: string,
  now = new Date(),
): Promise<AccountOverview | null> {
  const iso = now.toISOString();
  const rows = await prisma.$queryRaw<OverviewRow[]>`
    WITH s AS (
      SELECT cu."id", cu."email", cu."emailVerifiedAt"
      FROM "CustomerSession" cs
      JOIN "CustomerUser" cu ON cu."id" = cs."customerUserId"
      WHERE cs."tokenHash" = ${hashToken(sessionToken)}
        AND cs."expiresAt" > ${now}
    ), t AS (
      SELECT t."id", t."seq", t."status", t."createdAt",
             b."name" AS "businessName",
             (t."serviceDate" < (${iso}::timestamptz AT TIME ZONE b."timezone")::date
               AND t."status" <> 'SERVED') AS "expired"
      FROM "Ticket" t
      JOIN "Business" b ON b."id" = t."businessId"
      WHERE t."customerId" = (SELECT "id" FROM s)
        AND (
          t."status" IN ('WAITING', 'CALLED')
          OR t."serviceDate" >= (
            (${iso}::timestamptz AT TIME ZONE b."timezone")::date - 30
          )
        )
    )
    SELECT s."id", s."email", s."emailVerifiedAt",
           COALESCE((
             SELECT json_agg(json_build_object(
               'id', t."id",
               'seq', t."seq",
               'status', t."status",
               'expired', t."expired",
               'businessName', t."businessName"
             ) ORDER BY t."createdAt" DESC)
             FROM t
           ), '[]'::json) AS "tickets"
    FROM s`;

  const row = rows[0];
  if (!row) return null;

  return {
    customer: {
      id: row.id,
      email: row.email,
      emailVerified: row.emailVerifiedAt !== null,
    },
    tickets: (row.tickets ?? []).map((ticket) => ({
      id: ticket.id,
      number: formatNumber(ticket.seq),
      status: ticket.expired ? "EXPIRED" : ticket.status,
      businessName: ticket.businessName,
    })),
  };
}

export type QueueDirectoryEntry = {
  id: string;
  name: string;
  slug: string;
  activeTicket: {
    id: string;
    number: string;
    status: "WAITING" | "CALLED";
  } | null;
};

type DirectoryRow = {
  authenticated: number;
  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        activeTicket: {
          id: string;
          seq: number;
          status: "WAITING" | "CALLED";
        } | null;
      }[]
    | null;
};

export async function getQueueDirectory(
  sessionToken: string,
  now = new Date(),
): Promise<QueueDirectoryEntry[] | null> {
  const iso = now.toISOString();
  const rows = await prisma.$queryRaw<DirectoryRow[]>`
    WITH s AS (
      SELECT "customerUserId" AS "customerId"
      FROM "CustomerSession"
      WHERE "tokenHash" = ${hashToken(sessionToken)}
        AND "expiresAt" > ${now}
    ), d AS (
      SELECT b."id", b."name", b."slug",
             (
               SELECT json_build_object(
                 'id', t."id",
                 'seq', t."seq",
                 'status', t."status"
               )
               FROM "Ticket" t
               WHERE t."customerId" = (SELECT "customerId" FROM s)
                 AND t."businessId" = b."id"
                 AND t."serviceDate" = (${iso}::timestamptz AT TIME ZONE b."timezone")::date
                 AND t."status" IN ('WAITING', 'CALLED')
               LIMIT 1
             ) AS "activeTicket"
      FROM "Business" b
    )
    SELECT (SELECT count(*) FROM s)::int AS "authenticated",
           COALESCE((
             SELECT json_agg(json_build_object(
               'id', d."id",
               'name', d."name",
               'slug', d."slug",
               'activeTicket', d."activeTicket"
             ) ORDER BY d."name")
             FROM d
           ), '[]'::json) AS "businesses"`;

  const row = rows[0];
  if (!row || row.authenticated === 0) return null;

  return (row.businesses ?? []).map((business) => ({
    id: business.id,
    name: business.name,
    slug: business.slug,
    activeTicket: business.activeTicket
      ? {
          id: business.activeTicket.id,
          number: formatNumber(business.activeTicket.seq),
          status: business.activeTicket.status,
        }
      : null,
  }));
}
