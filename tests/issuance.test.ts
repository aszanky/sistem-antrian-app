import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { issueTicket } from "@/lib/ticket-service";
import { businessDate, serviceDateValue } from "@/lib/time";
import { publicTokenHash } from "@/lib/tokens";
import { createBusiness, issueOrThrow } from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");
const DAY = businessDate(NOW, "Asia/Jakarta");

describe("ticket issuance", () => {
  it("issues sequential numbers with three-digit padding", async () => {
    const business = await createBusiness();

    const first = await issueOrThrow(business.slug, NOW);
    const second = await issueOrThrow(business.slug, NOW);

    expect(first.number).toBe("001");
    expect(second.number).toBe("002");
    expect(first.ticket.status).toBe("WAITING");
  });

  it("keeps growing past 999", async () => {
    const business = await createBusiness();
    await prisma.dailySequence.upsert({
      where: {
        businessId_serviceDate: {
          businessId: business.id,
          serviceDate: serviceDateValue(DAY),
        },
      },
      update: { lastSeq: 999 },
      create: {
        businessId: business.id,
        serviceDate: serviceDateValue(DAY),
        lastSeq: 999,
      },
    });

    const issued = await issueOrThrow(business.slug, NOW);
    expect(issued.number).toBe("1000");
    expect(issued.ticket.seq).toBe(1000);
  });

  it("allocates ten distinct consecutive numbers under concurrency", async () => {
    const business = await createBusiness();

    const issued = await Promise.all(
      Array.from({ length: 10 }, () => issueOrThrow(business.slug, NOW)),
    );
    const numbers = issued.map((item) => item.ticket.seq).sort((a, b) => a - b);

    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(numbers).size).toBe(10);
  });

  it("resets numbering at the business's local midnight", async () => {
    const business = await createBusiness();

    const beforeMidnight = await issueOrThrow(
      business.slug,
      new Date("2026-05-01T16:59:59Z"),
    );
    const afterMidnight = await issueOrThrow(
      business.slug,
      new Date("2026-05-01T17:00:00Z"),
    );

    expect(beforeMidnight.number).toBe("001");
    expect(afterMidnight.number).toBe("001");
    expect(beforeMidnight.ticket.serviceDate.toISOString()).not.toBe(
      afterMidnight.ticket.serviceDate.toISOString(),
    );
  });

  it("returns null for an unknown business", async () => {
    expect(await issueTicket("missing-business", NOW)).toBeNull();
  });

  it("stores only the hash of a 128-bit token", async () => {
    const business = await createBusiness();
    const issued = await issueOrThrow(business.slug, NOW);

    expect(issued.token).toHaveLength(22);
    expect(issued.ticket.publicTokenHash).toBe(publicTokenHash(issued.token));
    expect(issued.ticket.publicTokenHash).toHaveLength(64);
    expect(issued.ticket.publicTokenHash).not.toContain(issued.token);
  });
});
