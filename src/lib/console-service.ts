import { prisma } from "./db";
import { formatNumber } from "./time";
import { hashToken } from "./auth";

export type ConsoleState = {
  sessionId: string;
  counterId: string | null;
  staffUserId: string;
  email: string;
  businessId: string;
  businessName: string;
  timezone: string;
  counters: { id: string; name: string }[];
  currentTicket: {
    id: string;
    number: string;
    calledAt: string | null;
    counterName: string | null;
  } | null;
  waitingCount: number;
};

type ConsoleRow = Omit<ConsoleState, "currentTicket"> & {
  currentTicket: {
    id: string;
    seq: number;
    calledAt: string | null;
    counterName: string | null;
  } | null;
};

export async function loadStaffConsole(
  token: string,
  now = new Date(),
): Promise<ConsoleState | null> {
  const rows = await prisma.$queryRaw<ConsoleRow[]>`
    WITH s AS (
      SELECT ss."id" AS "sessionId", ss."counterId", su."id" AS "staffUserId",
             su."email", su."businessId",
             b."name" AS "businessName", b."timezone", ss."expiresAt"
      FROM "StaffSession" ss
      JOIN "StaffUser" su ON su."id" = ss."staffUserId"
      JOIN "Business" b ON b."id" = su."businessId"
      WHERE ss."tokenHash" = ${hashToken(token)}
    )
    SELECT s."sessionId", s."counterId", s."staffUserId", s."email",
           s."businessId", s."businessName", s."timezone",
           COALESCE((
             SELECT json_agg(json_build_object('id', c."id", 'name', c."name") ORDER BY c."name")
             FROM "Counter" c WHERE c."businessId" = s."businessId"
           ), '[]'::json) AS "counters",
           (
             SELECT json_build_object(
               'id', t."id",
               'seq', t."seq",
               'calledAt', to_char(t."calledAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
               'counterName', k."name"
             )
             FROM "Ticket" t
             LEFT JOIN "Counter" k ON k."id" = t."counterId"
             WHERE t."counterId" = s."counterId" AND t."status" = 'CALLED'
             LIMIT 1
           ) AS "currentTicket",
           (
             SELECT count(*) FROM "Ticket" t
             WHERE t."businessId" = s."businessId"
               AND t."serviceDate" = (${now.toISOString()}::timestamptz AT TIME ZONE s."timezone")::date
               AND t."status" = 'WAITING'
           )::int AS "waitingCount"
    FROM s
    WHERE s."expiresAt" > ${now}`;

  const row = rows[0];
  if (!row) return null;

  const current = row.currentTicket;
  let currentTicket: ConsoleState["currentTicket"] = null;
  if (current) {
    const { seq, ...rest } = current;
    currentTicket = { ...rest, number: formatNumber(seq) };
  }

  return { ...row, currentTicket };
}
