import { prisma } from "./db";
import { findCounter, findTicketForBusiness } from "./data";
import { isUniqueViolation, QueueError } from "./errors";
import { businessDate } from "./time";

type CallContext = {
  businessId: string;
  counterId: string;
  staffId: string;
  timezone?: string;
};

type CallRow = {
  counterCount: number;
  busy: number;
  id: string | null;
  businessId: string | null;
  seq: number | null;
  counterId: string | null;
  calledByStaffId: string | null;
  calledAt: Date | null;
  status: string | null;
  counterName: string | null;
};

export async function callNext(
  { businessId, counterId, staffId, timezone }: CallContext,
  now = new Date(),
) {
  let zone = timezone;
  if (!zone) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    if (!business) throw new QueueError("BUSINESS_NOT_FOUND", 404);
    zone = business.timezone;
  }

  const day = businessDate(now, zone);
  try {
    const rows = await prisma.$queryRaw<CallRow[]>`
      WITH counter AS (
        SELECT "id", "name" FROM "Counter"
        WHERE "id" = ${counterId} AND "businessId" = ${businessId}
      ), busy AS (
        SELECT 1 FROM "Ticket"
        WHERE "counterId" = ${counterId} AND "status" = 'CALLED'
      ), claimed AS (
        UPDATE "Ticket"
        SET "status" = 'CALLED',
            "counterId" = ${counterId},
            "calledByStaffId" = ${staffId},
            "calledAt" = (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC')
        WHERE "id" = (
          SELECT t."id" FROM "Ticket" t
          WHERE t."businessId" = ${businessId}
            AND t."serviceDate" = ${day}::date
            AND t."status" = 'WAITING'
            AND NOT EXISTS (SELECT 1 FROM busy)
            AND EXISTS (SELECT 1 FROM counter)
          ORDER BY t."seq"
          LIMIT 1
          FOR UPDATE OF t SKIP LOCKED
        )
        RETURNING "id", "businessId", "seq", "counterId",
                  "calledByStaffId", "calledAt", "status"
      )
      SELECT (SELECT count(*) FROM counter)::int AS "counterCount",
             (SELECT count(*) FROM busy)::int AS "busy",
             c."id", c."businessId", c."seq", c."counterId",
             c."calledByStaffId", c."calledAt", c."status",
             k."name" AS "counterName"
      FROM (SELECT 1) AS one
      LEFT JOIN claimed c ON true
      LEFT JOIN counter k ON k."id" = c."counterId"`;

    const row = rows[0];
    if (row.counterCount === 0) {
      throw new QueueError("COUNTER_NOT_FOUND", 404);
    }
    if (row.busy > 0) throw new QueueError("COUNTER_BUSY", 409);
    if (!row.id || row.seq === null) throw new QueueError("QUEUE_EMPTY", 409);

    return {
      id: row.id,
      businessId: row.businessId ?? businessId,
      counterId: row.counterId ?? counterId,
      calledByStaffId: row.calledByStaffId,
      calledAt: row.calledAt,
      seq: row.seq,
      status: row.status ?? "CALLED",
      counterName: row.counterName,
    };
  } catch (error) {
    if (error instanceof QueueError) throw error;
    if (isUniqueViolation(error)) throw new QueueError("COUNTER_BUSY", 409);
    throw error;
  }
}

type ServeContext = {
  businessId: string;
  counterId: string;
  ticketId: string;
};

export async function serveTicket(
  { businessId, counterId, ticketId }: ServeContext,
  now = new Date(),
) {
  const rows = await prisma.$queryRaw<
    { seq: number; status: string; servedAt: Date }[]
  >`
    UPDATE "Ticket"
    SET "status" = 'SERVED',
        "servedAt" = (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC')
    WHERE "id" = ${ticketId}
      AND "businessId" = ${businessId}
      AND "counterId" = ${counterId}
      AND "status" = 'CALLED'
    RETURNING "seq", "status", "servedAt"`;

  const row = rows[0];
  if (row) {
    return {
      id: ticketId,
      businessId,
      counterId,
      seq: row.seq,
      status: row.status,
      servedAt: row.servedAt,
    };
  }

  const existing = await findTicketForBusiness(businessId, ticketId);
  if (!existing) throw new QueueError("TICKET_NOT_FOUND", 404);
  throw new QueueError("TICKET_NOT_SERVABLE", 409);
}

export async function selectCounter({
  sessionId,
  businessId,
  counterId,
}: {
  sessionId: string;
  businessId: string;
  counterId: string;
}) {
  const counter = await findCounter(businessId, counterId);
  if (!counter) throw new QueueError("COUNTER_NOT_FOUND", 404);

  await prisma.staffSession.update({
    where: { id: sessionId },
    data: { counterId },
  });
  return counter;
}

export async function callNextForSession(
  session: {
    counterId: string | null;
    staffUserId: string;
    staff: { businessId: string; business: { timezone: string } };
  },
  now = new Date(),
) {
  if (!session.counterId) throw new QueueError("COUNTER_REQUIRED", 409);
  return callNext(
    {
      businessId: session.staff.businessId,
      counterId: session.counterId,
      staffId: session.staffUserId,
      timezone: session.staff.business.timezone,
    },
    now,
  );
}

export async function serveTicketForSession(
  session: {
    counterId: string | null;
    staff: { businessId: string };
  },
  ticketId: string,
  now = new Date(),
) {
  if (!session.counterId) throw new QueueError("COUNTER_REQUIRED", 409);
  return serveTicket(
    {
      businessId: session.staff.businessId,
      counterId: session.counterId,
      ticketId,
    },
    now,
  );
}
