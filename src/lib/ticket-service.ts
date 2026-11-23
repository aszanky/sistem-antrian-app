import { randomUUID } from "node:crypto";
import { hashToken } from "./auth";
import { prisma } from "./db";
import { isUniqueViolation, QueueError } from "./errors";
import { businessDate, formatNumber } from "./time";
import { newPublicToken, publicTokenHash } from "./tokens";

export type TicketView = {
  number: string;
  status: "WAITING" | "CALLED" | "SERVED" | "EXPIRED";
  position: number | null;
  counterName: string | null;
  businessName: string;
  calledAt: string | null;
  servedAt: string | null;
};

type IssueRow = {
  authenticated: number;
  businessFound: number;
  existingId: string | null;
  existingSeq: number | null;
  newId: string | null;
  newSeq: number | null;
};

export async function issueTicketForCustomer(
  slug: string,
  sessionToken: string,
  now = new Date(),
) {
  const token = newPublicToken();
  const issuedId = randomUUID();
  const iso = now.toISOString();

  try {
    const rows = await prisma.$queryRaw<IssueRow[]>`
      WITH s AS (
        SELECT "customerUserId" AS "customerId"
        FROM "CustomerSession"
        WHERE "tokenHash" = ${hashToken(sessionToken)}
          AND "expiresAt" > ${now}
      ), b AS (
        SELECT "id", "timezone",
               (${iso}::timestamptz AT TIME ZONE "timezone")::date AS "serviceDate"
        FROM "Business"
        WHERE "slug" = ${slug}
      ), existing AS (
        SELECT t."id", t."seq"
        FROM "Ticket" t, s, b
        WHERE t."customerId" = s."customerId"
          AND t."businessId" = b."id"
          AND t."serviceDate" = b."serviceDate"
          AND t."status" IN ('WAITING', 'CALLED')
        LIMIT 1
      ), seq AS (
        INSERT INTO "DailySequence" ("businessId", "serviceDate", "lastSeq")
        SELECT b."id", b."serviceDate", 1 FROM b
        WHERE EXISTS (SELECT 1 FROM s)
          AND NOT EXISTS (SELECT 1 FROM existing)
        ON CONFLICT ("businessId", "serviceDate")
        DO UPDATE SET "lastSeq" = "DailySequence"."lastSeq" + 1
        RETURNING "businessId", "serviceDate", "lastSeq"
      ), inserted AS (
        INSERT INTO "Ticket"
          ("id", "publicTokenHash", "businessId", "serviceDate", "seq",
           "status", "createdAt", "customerId")
        SELECT ${issuedId}, ${publicTokenHash(token)}, seq."businessId",
               seq."serviceDate", seq."lastSeq", 'WAITING', now(),
               (SELECT "customerId" FROM s)
        FROM seq
        RETURNING "id", "seq"
      )
      SELECT
        (SELECT count(*) FROM s)::int AS "authenticated",
        (SELECT count(*) FROM b)::int AS "businessFound",
        (SELECT "id" FROM existing) AS "existingId",
        (SELECT "seq" FROM existing) AS "existingSeq",
        (SELECT "id" FROM inserted) AS "newId",
        (SELECT "seq" FROM inserted) AS "newSeq"`;

    const row = rows[0];
    if (row.authenticated === 0) throw new QueueError("UNAUTHORIZED", 401);
    if (row.businessFound === 0) {
      throw new QueueError("BUSINESS_NOT_FOUND", 404);
    }
    if (row.existingId && row.existingSeq !== null) {
      return {
        ticketId: row.existingId,
        seq: row.existingSeq,
        number: formatNumber(row.existingSeq),
        token: null,
        reused: true,
      };
    }
    if (row.newId && row.newSeq !== null) {
      return {
        ticketId: row.newId,
        seq: row.newSeq,
        number: formatNumber(row.newSeq),
        token,
        reused: false,
      };
    }
    throw new QueueError("ISSUE_FAILED", 500);
  } catch (error) {
    if (error instanceof QueueError) throw error;
    if (!isUniqueViolation(error)) throw error;

    const existing = await findActiveTicket(slug, sessionToken, now);
    if (!existing) throw error;
    return {
      ticketId: existing.id,
      seq: existing.seq,
      number: formatNumber(existing.seq),
      token: null,
      reused: true,
    };
  }
}

async function findActiveTicket(
  slug: string,
  sessionToken: string,
  now: Date,
) {
  const iso = now.toISOString();
  const rows = await prisma.$queryRaw<{ id: string; seq: number }[]>`
    SELECT t."id", t."seq"
    FROM "Ticket" t
    JOIN "CustomerSession" cs ON cs."customerUserId" = t."customerId"
    JOIN "Business" b ON b."id" = t."businessId"
    WHERE cs."tokenHash" = ${hashToken(sessionToken)}
      AND cs."expiresAt" > ${now}
      AND b."slug" = ${slug}
      AND t."serviceDate" = (${iso}::timestamptz AT TIME ZONE b."timezone")::date
      AND t."status" IN ('WAITING', 'CALLED')
    LIMIT 1`;
  return rows[0] ?? null;
}

type ViewRow = {
  authenticated: number;
  seq: number | null;
  status: "WAITING" | "CALLED" | "SERVED" | null;
  serviceDate: Date | null;
  calledAt: Date | null;
  servedAt: Date | null;
  businessName: string | null;
  timezone: string | null;
  counterName: string | null;
  waitingAhead: number | null;
};

export async function getTicketViewForCustomer(
  ticketId: string,
  sessionToken: string,
  now = new Date(),
): Promise<{ authenticated: boolean; view: TicketView | null }> {
  const rows = await prisma.$queryRaw<ViewRow[]>`
    WITH s AS (
      SELECT "customerUserId" AS "customerId"
      FROM "CustomerSession"
      WHERE "tokenHash" = ${hashToken(sessionToken)}
        AND "expiresAt" > ${now}
    )
    SELECT
      (SELECT count(*) FROM s)::int AS "authenticated",
      t."seq", t."status", t."serviceDate", t."calledAt", t."servedAt",
      b."name" AS "businessName", b."timezone",
      c."name" AS "counterName",
      (
        SELECT count(*) FROM "Ticket" w
        WHERE w."businessId" = t."businessId"
          AND w."serviceDate" = t."serviceDate"
          AND w."status" = 'WAITING'
          AND w."seq" < t."seq"
      )::int AS "waitingAhead"
    FROM (SELECT 1) AS one
    LEFT JOIN "Ticket" t
      ON t."id" = ${ticketId}
      AND t."customerId" = (SELECT "customerId" FROM s)
    LEFT JOIN "Business" b ON b."id" = t."businessId"
    LEFT JOIN "Counter" c ON c."id" = t."counterId"`;

  const row = rows[0];
  const authenticated = (row?.authenticated ?? 0) > 0;
  if (!authenticated) return { authenticated: false, view: null };
  if (
    !row ||
    row.seq === null ||
    !row.status ||
    !row.serviceDate ||
    !row.businessName ||
    !row.timezone
  ) {
    return { authenticated: true, view: null };
  }

  const today = businessDate(now, row.timezone);
  const ticketDay = row.serviceDate.toISOString().slice(0, 10);
  const expired = row.status !== "SERVED" && ticketDay < today;
  const status = expired ? "EXPIRED" : row.status;

  return {
    authenticated: true,
    view: {
      number: formatNumber(row.seq),
      status,
      position: status === "WAITING" ? (row.waitingAhead ?? 0) : null,
      counterName: row.counterName,
      businessName: row.businessName,
      calledAt: row.calledAt?.toISOString() ?? null,
      servedAt: row.servedAt?.toISOString() ?? null,
    },
  };
}

export async function getTicketOwnerByToken(token: string) {
  return prisma.ticket.findUnique({
    where: { publicTokenHash: publicTokenHash(token) },
    select: { id: true, customerId: true },
  });
}
