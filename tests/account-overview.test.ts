import { describe, expect, it } from "vitest";
import { getAccountOverview } from "@/lib/account-service";
import { prisma } from "@/lib/db";
import { serviceDateValue } from "@/lib/time";
import { publicTokenHash } from "@/lib/tokens";
import {
  createBusiness,
  createCustomerWithSession,
  issueOrThrow,
  unique,
} from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");
const YESTERDAY = new Date("2026-04-30T03:00:00Z");

describe("account ticket list", () => {
  it("lists active tickets and recent history across businesses", async () => {
    const first = await createBusiness();
    const second = await createBusiness();
    const account = await createCustomerWithSession();
    const active = await issueOrThrow(first.slug, account.token, NOW);
    const recent = await issueOrThrow(second.slug, account.token, NOW);
    await prisma.ticket.update({
      where: { id: recent.ticketId },
      data: {
        status: "SERVED",
        servedAt: NOW,
        serviceDate: serviceDateValue("2026-04-21"),
      },
    });

    const overview = await getAccountOverview(account.token, NOW);
    const ids = overview?.tickets.map((ticket) => ticket.id);

    expect(ids).toContain(active.ticketId);
    expect(ids).toContain(recent.ticketId);
    expect(overview?.tickets.find((ticket) => ticket.id === active.ticketId))
      .toMatchObject({ status: "WAITING", businessName: first.name });
  });

  it("excludes served tickets older than 30 days", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
    const old = await issueOrThrow(business.slug, account.token, NOW);
    await prisma.ticket.update({
      where: { id: old.ticketId },
      data: {
        status: "SERVED",
        servedAt: NOW,
        serviceDate: serviceDateValue("2026-03-01"),
      },
    });

    const overview = await getAccountOverview(account.token, NOW);
    expect(overview?.tickets.map((ticket) => ticket.id)).not.toContain(
      old.ticketId,
    );
  });

  it("shows a prior-day unserved ticket as expired", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
    await issueOrThrow(business.slug, account.token, YESTERDAY);

    const overview = await getAccountOverview(account.token, NOW);
    expect(overview?.tickets[0]?.status).toBe("EXPIRED");
  });

  it("does not list another customer's tickets", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
    await issueOrThrow(business.slug, account.token, NOW);
    const other = await createCustomerWithSession();

    const overview = await getAccountOverview(other.token, NOW);
    expect(overview?.tickets).toEqual([]);
  });

  it("does not list legacy unowned tickets", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
    await prisma.ticket.create({
      data: {
        publicTokenHash: publicTokenHash(unique("legacy-account-token")),
        businessId: business.id,
        serviceDate: serviceDateValue("2026-05-01"),
        seq: 1,
        customerId: null,
      },
    });

    const overview = await getAccountOverview(account.token, NOW);
    expect(overview?.tickets).toEqual([]);
  });

  it("returns null for an expired session", async () => {
    const account = await createCustomerWithSession();
    await prisma.customerSession.updateMany({
      where: { customerUserId: account.customer.id },
      data: { expiresAt: new Date(NOW.getTime() - 1000) },
    });

    expect(await getAccountOverview(account.token, NOW)).toBeNull();
  });
});
