import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { callNext, serveTicket } from "@/lib/queue-service";
import {
  createCounter,
  createFixture,
  expectQueueError,
  issueOrThrow,
} from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");
const YESTERDAY = new Date("2026-04-30T03:00:00Z");

describe("call next", () => {
  it("calls the oldest waiting ticket and attributes it to the counter and staff", async () => {
    const { business, staff, counter } = await createFixture();
    await issueOrThrow(business.slug, NOW);
    await issueOrThrow(business.slug, NOW);
    await issueOrThrow(business.slug, NOW);

    const called = await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );

    expect(called.seq).toBe(1);
    expect(called.counterId).toBe(counter.id);
    expect(called.status).toBe("CALLED");
    expect(called.calledByStaffId).toBe(staff.id);
    expect(called.calledAt?.toISOString()).toBe(NOW.toISOString());
  });

  it("reports an empty queue without changing tickets", async () => {
    const { business, staff, counter } = await createFixture();

    await expectQueueError(
      callNext(
        { businessId: business.id, counterId: counter.id, staffId: staff.id },
        NOW,
      ),
      "QUEUE_EMPTY",
    );

    expect(await prisma.ticket.count({ where: { businessId: business.id } })).toBe(
      0,
    );
  });

  it("rejects a second call while the counter holds a ticket", async () => {
    const { business, staff, counter } = await createFixture();
    await issueOrThrow(business.slug, NOW);
    const second = await issueOrThrow(business.slug, NOW);

    await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );
    await expectQueueError(
      callNext(
        { businessId: business.id, counterId: counter.id, staffId: staff.id },
        NOW,
      ),
      "COUNTER_BUSY",
    );

    expect(
      (await prisma.ticket.findUniqueOrThrow({ where: { id: second.ticket.id } }))
        .status,
    ).toBe("WAITING");
  });

  it("gives concurrent counters distinct tickets", async () => {
    const { business, staff, counter } = await createFixture();
    const secondCounter = await createCounter(business.id);
    await issueOrThrow(business.slug, NOW);
    await issueOrThrow(business.slug, NOW);
    const third = await issueOrThrow(business.slug, NOW);

    const calls = await Promise.all([
      callNext(
        { businessId: business.id, counterId: counter.id, staffId: staff.id },
        NOW,
      ),
      callNext(
        {
          businessId: business.id,
          counterId: secondCounter.id,
          staffId: staff.id,
        },
        NOW,
      ),
    ]);

    expect(new Set(calls.map((ticket) => ticket.id)).size).toBe(2);
    expect(
      (
        await prisma.ticket.findUniqueOrThrow({
          where: { id: third.ticket.id },
        })
      ).status,
    ).toBe("WAITING");
  });

  it("claims one waiting ticket exactly once across two counters", async () => {
    const { business, staff, counter } = await createFixture();
    const secondCounter = await createCounter(business.id);
    await issueOrThrow(business.slug, NOW);

    const results = await Promise.allSettled([
      callNext(
        { businessId: business.id, counterId: counter.id, staffId: staff.id },
        NOW,
      ),
      callNext(
        {
          businessId: business.id,
          counterId: secondCounter.id,
          staffId: staff.id,
        },
        NOW,
      ),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      await prisma.ticket.count({
        where: { businessId: business.id, status: "CALLED" },
      }),
    ).toBe(1);
  });

  it("does not call a ticket from a previous business day", async () => {
    const { business, staff, counter } = await createFixture();
    await issueOrThrow(business.slug, YESTERDAY);

    await expectQueueError(
      callNext(
        { businessId: business.id, counterId: counter.id, staffId: staff.id },
        NOW,
      ),
      "QUEUE_EMPTY",
    );
  });
});

describe("mark served", () => {
  it("serves the counter's own called ticket and records the time", async () => {
    const { business, staff, counter } = await createFixture();
    await issueOrThrow(business.slug, NOW);
    const called = await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );

    const served = await serveTicket(
      { businessId: business.id, counterId: counter.id, ticketId: called.id },
      NOW,
    );

    expect(served.status).toBe("SERVED");
    expect(served.servedAt).not.toBeNull();
    expect(
      await prisma.ticket.count({
        where: { counterId: counter.id, status: "CALLED" },
      }),
    ).toBe(0);
  });

  it("rejects serving from a different counter", async () => {
    const { business, staff, counter } = await createFixture();
    const otherCounter = await createCounter(business.id);
    await issueOrThrow(business.slug, NOW);
    const called = await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );

    await expectQueueError(
      serveTicket(
        {
          businessId: business.id,
          counterId: otherCounter.id,
          ticketId: called.id,
        },
        NOW,
      ),
      "TICKET_NOT_SERVABLE",
    );

    expect(
      (
        await prisma.ticket.findUniqueOrThrow({ where: { id: called.id } })
      ).status,
    ).toBe("CALLED");
  });

  it("rejects serving twice and keeps the original completion time", async () => {
    const { business, staff, counter } = await createFixture();
    await issueOrThrow(business.slug, NOW);
    const called = await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );
    const served = await serveTicket(
      { businessId: business.id, counterId: counter.id, ticketId: called.id },
      NOW,
    );

    await expectQueueError(
      serveTicket(
        { businessId: business.id, counterId: counter.id, ticketId: called.id },
        new Date(NOW.getTime() + 60_000),
      ),
      "TICKET_NOT_SERVABLE",
    );

    expect(
      (
        await prisma.ticket.findUniqueOrThrow({ where: { id: called.id } })
      ).servedAt?.getTime(),
    ).toBe(served.servedAt?.getTime());
  });

  it("frees the counter for the next ticket", async () => {
    const { business, staff, counter } = await createFixture();
    await issueOrThrow(business.slug, NOW);
    await issueOrThrow(business.slug, NOW);
    const first = await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );
    await serveTicket(
      { businessId: business.id, counterId: counter.id, ticketId: first.id },
      NOW,
    );

    const next = await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );
    expect(next.seq).toBe(2);
  });
});
