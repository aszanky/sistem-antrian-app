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
  issueOrThrow,
} from "./helpers";

describe("tenant-scoped data access", () => {
  it("cannot read another business's counters or tickets", async () => {
    const first = await createBusiness();
    const second = await createBusiness();
    const counter = await createCounter(first.id);
    const otherCounter = await createCounter(second.id);
    const issued = await issueOrThrow(first.slug);

    expect((await listCounters(first.id)).map((item) => item.id)).toEqual([
      counter.id,
    ]);
    expect(await listCounters(second.id)).toEqual([
      expect.objectContaining({ id: otherCounter.id }),
    ]);
    expect(await findCounter(second.id, counter.id)).toBeNull();
    expect(await findTicketForBusiness(second.id, issued.ticket.id)).toBeNull();
    expect(
      await findTicketForBusiness(first.id, issued.ticket.id),
    ).not.toBeNull();
  });

  it("keeps ticket tokens scoped to their own business", async () => {
    const first = await createBusiness();
    const second = await createBusiness();
    const issued = await issueOrThrow(first.slug);
    const stored = await prisma.ticket.findFirst({
      where: { publicTokenHash: issued.ticket.publicTokenHash },
    });

    expect(stored?.businessId).toBe(first.id);
    expect(stored?.businessId).not.toBe(second.id);
    expect(issued.token).not.toBe(issued.ticket.publicTokenHash);
  });
});
