import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getTicketView } from "@/lib/ticket-service";
import { callNext, serveTicket } from "@/lib/queue-service";
import {
  createFixture,
  expectQueueError,
  issueOrThrow,
} from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");

describe("two businesses end to end", () => {
  it("keeps tickets, counters, calls, and serves inside each tenant", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const firstTicket = await issueOrThrow(first.business.slug, NOW);
    const secondTicket = await issueOrThrow(second.business.slug, NOW);

    expect(firstTicket.number).toBe("001");
    expect(secondTicket.number).toBe("001");

    const firstCalled = await callNext(
      {
        businessId: first.business.id,
        counterId: first.counter.id,
        staffId: first.staff.id,
      },
      NOW,
    );
    const secondCalled = await callNext(
      {
        businessId: second.business.id,
        counterId: second.counter.id,
        staffId: second.staff.id,
      },
      NOW,
    );

    expect(firstCalled.businessId).toBe(first.business.id);
    expect(secondCalled.businessId).toBe(second.business.id);
    expect((await getTicketView(secondTicket.token, NOW))?.status).toBe(
      "CALLED",
    );

    await expectQueueError(
      serveTicket(
        {
          businessId: second.business.id,
          counterId: second.counter.id,
          ticketId: firstCalled.id,
        },
        NOW,
      ),
      "TICKET_NOT_FOUND",
    );

    await serveTicket(
      {
        businessId: first.business.id,
        counterId: first.counter.id,
        ticketId: firstCalled.id,
      },
      NOW,
    );
    expect((await getTicketView(firstTicket.token, NOW))?.status).toBe(
      "SERVED",
    );
    expect(
      (await getTicketView(secondTicket.token, NOW))?.status,
    ).toBe("CALLED");
  });

  it("keeps database invariants and rejects guessed tokens", async () => {
    const first = await createFixture();
    const businessIds = [first.business.id];
    const issued = await issueOrThrow(first.business.slug, NOW);

    const duplicates = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "businessId", "serviceDate", "seq"
        FROM "Ticket"
        WHERE "businessId" IN (${first.business.id})
        GROUP BY "businessId", "serviceDate", "seq"
        HAVING COUNT(*) > 1
      ) AS duplicates`;
    expect(Number(duplicates[0].count)).toBe(0);

    const calledPerCounter = await prisma.ticket.groupBy({
      by: ["counterId"],
      where: { businessId: { in: businessIds }, status: "CALLED" },
      _count: { _all: true },
    });
    for (const row of calledPerCounter) {
      expect(row._count._all).toBeLessThanOrEqual(1);
    }

    expect(await getTicketView(issued.token.slice(0, -1), NOW)).toBeNull();
    expect(await getTicketView("AAAAAAAAAAAAAAAAAAAAAA", NOW)).toBeNull();
  });
});
