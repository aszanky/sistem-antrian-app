import { describe, expect, it } from "vitest";
import { getAccountOverview } from "@/lib/account-service";
import { prisma } from "@/lib/db";
import { callNext, serveTicket } from "@/lib/queue-service";
import {
  getTicketViewForCustomer,
  issueTicketForCustomer,
} from "@/lib/ticket-service";
import {
  createFixture,
  createCustomerWithSession,
  issueOrThrow,
} from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");

describe("customer accounts end to end", () => {
  it("isolates tickets and lets staff serve an owned ticket", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const firstAccount = await createCustomerWithSession();
    const secondAccount = await createCustomerWithSession();

    const firstTicket = await issueOrThrow(
      first.business.slug,
      firstAccount.token,
      NOW,
    );
    const secondTicket = await issueOrThrow(
      second.business.slug,
      secondAccount.token,
      NOW,
    );

    expect(firstTicket.number).toBe("001");
    expect(secondTicket.number).toBe("001");

    const duplicate = await issueOrThrow(
      first.business.slug,
      firstAccount.token,
      NOW,
    );
    expect(duplicate.reused).toBe(true);
    expect(duplicate.ticketId).toBe(firstTicket.ticketId);

    const crossView = await getTicketViewForCustomer(
      secondTicket.ticketId,
      firstAccount.token,
      NOW,
    );
    expect(crossView).toEqual({ authenticated: true, view: null });

    const firstCalled = await callNext(
      {
        businessId: first.business.id,
        counterId: first.counter.id,
        staffId: first.staff.id,
      },
      NOW,
    );
    await serveTicket(
      {
        businessId: first.business.id,
        counterId: first.counter.id,
        ticketId: firstCalled.id,
      },
      NOW,
    );

    expect(
      (
        await getTicketViewForCustomer(
          firstTicket.ticketId,
          firstAccount.token,
          NOW,
        )
      ).view?.status,
    ).toBe("SERVED");
    expect(
      (
        await getTicketViewForCustomer(
          secondTicket.ticketId,
          secondAccount.token,
          NOW,
        )
      ).view?.status,
    ).toBe("WAITING");

    const firstOverview = await getAccountOverview(firstAccount.token, NOW);
    const secondOverview = await getAccountOverview(secondAccount.token, NOW);

    expect(firstOverview?.tickets).toHaveLength(1);
    expect(firstOverview?.tickets[0]).toMatchObject({
      id: firstTicket.ticketId,
      status: "SERVED",
      businessName: first.business.name,
    });
    expect(secondOverview?.tickets).toHaveLength(1);
    expect(secondOverview?.tickets[0]?.id).toBe(secondTicket.ticketId);
  });

  it("keeps numbering and call invariants under accounts", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const account = await createCustomerWithSession();
    await issueOrThrow(first.business.slug, account.token, NOW);
    await issueOrThrow(second.business.slug, account.token, NOW);

    const duplicates = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "businessId", "serviceDate", "seq"
        FROM "Ticket"
        WHERE "businessId" IN (${first.business.id}, ${second.business.id})
        GROUP BY "businessId", "serviceDate", "seq"
        HAVING COUNT(*) > 1
      ) AS duplicates`;
    expect(Number(duplicates[0].count)).toBe(0);

    const calledPerCounter = await prisma.ticket.groupBy({
      by: ["counterId"],
      where: {
        businessId: { in: [first.business.id, second.business.id] },
        status: "CALLED",
      },
      _count: { _all: true },
    });
    for (const row of calledPerCounter) {
      expect(row._count._all).toBeLessThanOrEqual(1);
    }

    expect(
      await prisma.ticket.count({
        where: {
          businessId: { in: [first.business.id, second.business.id] },
          customerId: account.customer.id,
        },
      }),
    ).toBe(2);
  });

  it("rejects an unauthenticated issuance attempt", async () => {
    await expect(
      issueTicketForCustomer("demo-teller", "bogus-token", NOW),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
