import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { issueTicketForCustomer } from "@/lib/ticket-service";
import { businessDate, serviceDateValue } from "@/lib/time";
import { publicTokenHash } from "@/lib/tokens";
import {
  createBusiness,
  createCustomerWithSession,
  expectQueueError,
  issueOrThrow,
} from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");
const DAY = businessDate(NOW, "Asia/Jakarta");

describe("account ticket issuance", () => {
  it("issues sequential numbers across customers with padding", async () => {
    const business = await createBusiness();
    const first = await createCustomerWithSession();
    const second = await createCustomerWithSession();

    const firstIssue = await issueOrThrow(business.slug, first.token, NOW);
    const secondIssue = await issueOrThrow(business.slug, second.token, NOW);

    expect(firstIssue.number).toBe("001");
    expect(secondIssue.number).toBe("002");
    expect(firstIssue.reused).toBe(false);
  });

  it("keeps growing past 999", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
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

    const issued = await issueOrThrow(business.slug, account.token, NOW);
    expect(issued.number).toBe("1000");
    expect(issued.seq).toBe(1000);
  });

  it("allocates ten distinct consecutive numbers under concurrency", async () => {
    const business = await createBusiness();
    const accounts = await Promise.all(
      Array.from({ length: 10 }, () => createCustomerWithSession()),
    );

    const issued = await Promise.all(
      accounts.map((account) => issueOrThrow(business.slug, account.token, NOW)),
    );
    const numbers = issued.map((item) => item.seq).sort((a, b) => a - b);

    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("resets numbering at the business's local midnight", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();

    const beforeMidnight = await issueOrThrow(
      business.slug,
      account.token,
      new Date("2026-05-01T16:59:59Z"),
    );
    const afterMidnight = await issueOrThrow(
      business.slug,
      account.token,
      new Date("2026-05-01T17:00:00Z"),
    );

    expect(beforeMidnight.number).toBe("001");
    expect(afterMidnight.number).toBe("001");
    expect(beforeMidnight.ticketId).not.toBe(afterMidnight.ticketId);
  });

  it("rejects an authenticated request for an unknown business", async () => {
    const account = await createCustomerWithSession();
    await expectQueueError(
      issueTicketForCustomer("missing-business", account.token, NOW),
      "BUSINESS_NOT_FOUND",
    );
  });

  it("rejects an unauthenticated request", async () => {
    const business = await createBusiness();
    await expectQueueError(
      issueTicketForCustomer(business.slug, "not-a-session", NOW),
      "UNAUTHORIZED",
    );
  });

  it("links the ticket to the customer and stores only the token hash", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
    const issued = await issueOrThrow(business.slug, account.token, NOW);

    const stored = await prisma.ticket.findUniqueOrThrow({
      where: { id: issued.ticketId },
    });
    expect(stored.customerId).toBe(account.customer.id);
    expect(stored.publicTokenHash).toBe(publicTokenHash(issued.token ?? ""));
    expect(issued.token).toHaveLength(22);
    expect(stored.publicTokenHash).toHaveLength(64);
  });

  it("returns the existing ticket for a repeat request without advancing the sequence", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
    const first = await issueOrThrow(business.slug, account.token, NOW);
    const sequence = await prisma.dailySequence.findUniqueOrThrow({
      where: {
        businessId_serviceDate: {
          businessId: business.id,
          serviceDate: serviceDateValue(DAY),
        },
      },
    });

    const second = await issueOrThrow(business.slug, account.token, NOW);

    expect(second.reused).toBe(true);
    expect(second.ticketId).toBe(first.ticketId);
    expect(second.seq).toBe(first.seq);
    expect(
      (
        await prisma.dailySequence.findUniqueOrThrow({
          where: {
            businessId_serviceDate: {
              businessId: business.id,
              serviceDate: serviceDateValue(DAY),
            },
          },
        })
      ).lastSeq,
    ).toBe(sequence.lastSeq);
  });

  it("allows the same customer at a different business", async () => {
    const firstBusiness = await createBusiness();
    const secondBusiness = await createBusiness();
    const account = await createCustomerWithSession();

    const first = await issueOrThrow(firstBusiness.slug, account.token, NOW);
    const second = await issueOrThrow(secondBusiness.slug, account.token, NOW);

    expect(second.ticketId).not.toBe(first.ticketId);
    expect(second.number).toBe("001");
  });

  it("allows the same customer on the next business day", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();

    const first = await issueOrThrow(business.slug, account.token, NOW);
    const nextDay = await issueOrThrow(
      business.slug,
      account.token,
      new Date("2026-05-02T03:00:00Z"),
    );

    expect(nextDay.ticketId).not.toBe(first.ticketId);
    expect(nextDay.number).toBe("001");
  });

  it("collapses concurrent duplicate requests into one ticket", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        issueTicketForCustomer(business.slug, account.token, NOW),
      ),
    );

    expect(new Set(results.map((result) => result.ticketId)).size).toBe(1);
    expect(
      await prisma.ticket.count({
        where: { businessId: business.id, customerId: account.customer.id },
      }),
    ).toBe(1);
  });

  it("lets an unverified customer take a ticket", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
    expect(account.customer.emailVerifiedAt).toBeNull();

    const issued = await issueOrThrow(business.slug, account.token, NOW);
    expect(issued.seq).toBe(1);
  });
});
