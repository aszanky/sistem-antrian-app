import { describe, expect, it } from "vitest";
import {
  findCounter,
  findTicketForBusiness,
  listCounters,
} from "@/lib/data";
import { prisma } from "@/lib/db";
import {
  createBusiness,
  createCounter,
  createCustomerWithSession,
  issueOrThrow,
} from "./helpers";

describe("tenant-scoped data access", () => {
  it("cannot read another business's counters or tickets", async () => {
    const first = await createBusiness();
    const second = await createBusiness();
    const counter = await createCounter(first.id);
    const otherCounter = await createCounter(second.id);
    const account = await createCustomerWithSession();
    const issued = await issueOrThrow(first.slug, account.token);

    expect((await listCounters(first.id)).map((item) => item.id)).toEqual([
      counter.id,
    ]);
    expect(await listCounters(second.id)).toEqual([
      expect.objectContaining({ id: otherCounter.id }),
    ]);
    expect(await findCounter(second.id, counter.id)).toBeNull();
    expect(await findTicketForBusiness(second.id, issued.ticketId)).toBeNull();
    expect(
      await findTicketForBusiness(first.id, issued.ticketId),
    ).not.toBeNull();
  });

  it("keeps ticket tokens scoped to their own business", async () => {
    const first = await createBusiness();
    const second = await createBusiness();
    const account = await createCustomerWithSession();
    const issued = await issueOrThrow(first.slug, account.token);
    const stored = await prisma.ticket.findUniqueOrThrow({
      where: { id: issued.ticketId },
    });

    expect(stored.businessId).toBe(first.id);
    expect(stored.businessId).not.toBe(second.id);
    expect(issued.token).not.toBe(stored.publicTokenHash);
  });
});
