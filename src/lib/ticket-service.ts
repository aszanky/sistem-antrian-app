import { randomUUID } from "node:crypto";
import { prisma } from "./db";
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

type IssuedRow = {
  id: string;
  publicTokenHash: string;
  businessId: string;
  serviceDate: Date;
  seq: number;
  status: string;
  counterId: string | null;
  calledByStaffId: string | null;
  calledAt: Date | null;
  servedAt: Date | null;
  createdAt: Date;
};

export async function issueTicket(slug: string, now = new Date()) {
  const token = newPublicToken();
  const issuedId = randomUUID();
  const rows = await prisma.$queryRaw<IssuedRow[]>`
    WITH b AS (
      SELECT "id", "timezone",
             (${now.toISOString()}::timestamptz AT TIME ZONE "timezone")::date AS "serviceDate"
      FROM "Business"
      WHERE "slug" = ${slug}
    ), s AS (
      INSERT INTO "DailySequence" ("businessId", "serviceDate", "lastSeq")
      SELECT "id", "serviceDate", 1 FROM b
      ON CONFLICT ("businessId", "serviceDate")
      DO UPDATE SET "lastSeq" = "DailySequence"."lastSeq" + 1
      RETURNING "businessId", "serviceDate", "lastSeq"
    )
    INSERT INTO "Ticket"
      ("id", "publicTokenHash", "businessId", "serviceDate", "seq", "status", "createdAt")
    SELECT ${issuedId}, ${publicTokenHash(token)}, s."businessId", s."serviceDate",
           s."lastSeq", 'WAITING', now()
    FROM s
    RETURNING "id", "publicTokenHash", "businessId", "serviceDate", "seq",
              "status", "counterId", "calledByStaffId", "calledAt", "servedAt", "createdAt"`;

  const ticket = rows[0];
  if (!ticket) return null;
  return { ticket, token, number: formatNumber(ticket.seq) };
}

type ViewRow = {
  seq: number;
  status: "WAITING" | "CALLED" | "SERVED";
  serviceDate: Date;
  calledAt: Date | null;
  servedAt: Date | null;
  businessName: string;
  timezone: string;
  counterName: string | null;
  waitingAhead: number;
};

export async function getTicketView(
  token: string,
  now = new Date(),
): Promise<TicketView | null> {
  const rows = await prisma.$queryRaw<ViewRow[]>`
    SELECT t."seq", t."status", t."serviceDate", t."calledAt", t."servedAt",
           b."name" AS "businessName", b."timezone",
           c."name" AS "counterName",
           (SELECT count(*) FROM "Ticket" w
             WHERE w."businessId" = t."businessId"
               AND w."serviceDate" = t."serviceDate"
               AND w."status" = 'WAITING'
               AND w."seq" < t."seq")::int AS "waitingAhead"
    FROM "Ticket" t
    JOIN "Business" b ON b."id" = t."businessId"
    LEFT JOIN "Counter" c ON c."id" = t."counterId"
    WHERE t."publicTokenHash" = ${publicTokenHash(token)}`;

  const row = rows[0];
  if (!row) return null;

  const today = businessDate(now, row.timezone);
  const ticketDay = row.serviceDate.toISOString().slice(0, 10);
  const expired = row.status !== "SERVED" && ticketDay < today;
  const status = expired ? "EXPIRED" : row.status;

  return {
    number: formatNumber(row.seq),
    status,
    position: status === "WAITING" ? row.waitingAhead : null,
    counterName: row.counterName,
    businessName: row.businessName,
    calledAt: row.calledAt?.toISOString() ?? null,
    servedAt: row.servedAt?.toISOString() ?? null,
  };
}
