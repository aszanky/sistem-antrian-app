import { describe, expect, it } from "vitest";
import { callNext, serveTicket } from "@/lib/queue-service";
import { prisma } from "@/lib/db";
import {
  getTicketOwnerByToken,
  getTicketViewForCustomer,
} from "@/lib/ticket-service";
import { serviceDateValue } from "@/lib/time";
import { publicTokenHash } from "@/lib/tokens";
import {
  createCustomerWithSession,
  createFixture,
  issueOrThrow,
  issueTicketsForBusiness,
  unique,
} from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");
const YESTERDAY = new Date("2026-04-30T03:00:00Z");

describe("account ticket view", () => {
  it("returns the number, waiting status, and position to the owner", async () => {
    const fixture = await createFixture();
    const first = await issueOrThrow(
      fixture.business.slug,
      fixture.customerToken,
      NOW,
    );
    const account = await createCustomerWithSession();
    const second = await issueOrThrow(fixture.business.slug, account.token, NOW);

    const firstView = await getTicketViewForCustomer(
      first.ticketId,
      fixture.customerToken,
      NOW,
    );
    const secondView = await getTicketViewForCustomer(
      second.ticketId,
      account.token,
      NOW,
    );

    expect(firstView.view).toMatchObject({
      number: "001",
      status: "WAITING",
      position: 0,
    });
    expect(secondView.view).toMatchObject({
      number: "002",
      status: "WAITING",
      position: 1,
    });
  });

  it("advances position when earlier tickets are served", async () => {
    const fixture = await createFixture();
    const tickets = await issueTicketsForBusiness(fixture.business.slug, 3, NOW);

    const called = await callNext(
      {
        businessId: fixture.business.id,
        counterId: fixture.counter.id,
        staffId: fixture.staff.id,
      },
      NOW,
    );
    await serveTicket(
      {
        businessId: fixture.business.id,
        counterId: fixture.counter.id,
        ticketId: called.id,
      },
      NOW,
    );

    const thirdView = await getTicketViewForCustomer(
      tickets[2].ticketId,
      tickets[2].customerToken,
      NOW,
    );
    expect(thirdView.view).toMatchObject({ status: "WAITING", position: 1 });
  });

  it("shows the counter once called", async () => {
    const fixture = await createFixture();
    const issued = await issueOrThrow(
      fixture.business.slug,
      fixture.customerToken,
      NOW,
    );

    await callNext(
      {
        businessId: fixture.business.id,
        counterId: fixture.counter.id,
        staffId: fixture.staff.id,
      },
      NOW,
    );

    const view = await getTicketViewForCustomer(
      issued.ticketId,
      fixture.customerToken,
      NOW,
    );
    expect(view.view).toMatchObject({
      status: "CALLED",
      counterName: fixture.counter.name,
    });
  });

  it("rejects an unauthenticated request", async () => {
    const fixture = await createFixture();
    const issued = await issueOrThrow(
      fixture.business.slug,
      fixture.customerToken,
      NOW,
    );

    expect(
      await getTicketViewForCustomer(issued.ticketId, "not-a-session", NOW),
    ).toEqual({ authenticated: false, view: null });
  });

  it("returns no view to another customer", async () => {
    const fixture = await createFixture();
    const issued = await issueOrThrow(
      fixture.business.slug,
      fixture.customerToken,
      NOW,
    );
    const other = await createCustomerWithSession();

    expect(
      await getTicketViewForCustomer(issued.ticketId, other.token, NOW),
    ).toEqual({ authenticated: true, view: null });
  });

  it("returns no view for an unknown ticket", async () => {
    const fixture = await createFixture();
    expect(
      await getTicketViewForCustomer(
        "missing-ticket",
        fixture.customerToken,
        NOW,
      ),
    ).toEqual({ authenticated: true, view: null });
  });

  it("marks a prior-day waiting ticket as expired", async () => {
    const fixture = await createFixture();
    const issued = await issueOrThrow(
      fixture.business.slug,
      fixture.customerToken,
      YESTERDAY,
    );

    const view = await getTicketViewForCustomer(
      issued.ticketId,
      fixture.customerToken,
      NOW,
    );
    expect(view.view).toMatchObject({ status: "EXPIRED", position: null });
  });

  it("keeps a served prior-day ticket readable", async () => {
    const fixture = await createFixture();
    const issued = await issueOrThrow(
      fixture.business.slug,
      fixture.customerToken,
      YESTERDAY,
    );
    await callNext(
      {
        businessId: fixture.business.id,
        counterId: fixture.counter.id,
        staffId: fixture.staff.id,
      },
      YESTERDAY,
    );
    await serveTicket(
      {
        businessId: fixture.business.id,
        counterId: fixture.counter.id,
        ticketId: issued.ticketId,
      },
      YESTERDAY,
    );

    const view = await getTicketViewForCustomer(
      issued.ticketId,
      fixture.customerToken,
      NOW,
    );
    expect(view.view?.status).toBe("SERVED");
    expect(view.view?.servedAt).not.toBeNull();
  });

  it("does not expose a legacy unowned ticket to any customer", async () => {
    const fixture = await createFixture();
    const legacy = await prisma.ticket.create({
      data: {
        publicTokenHash: publicTokenHash(unique("legacy-token")),
        businessId: fixture.business.id,
        serviceDate: serviceDateValue("2026-05-01"),
        seq: 1,
        customerId: null,
      },
    });

    expect(
      await getTicketViewForCustomer(
        legacy.id,
        fixture.customerToken,
        NOW,
      ),
    ).toEqual({ authenticated: true, view: null });
  });

  it("resolves a token to its owner for the deep-link check", async () => {
    const fixture = await createFixture();
    const issued = await issueOrThrow(
      fixture.business.slug,
      fixture.customerToken,
      NOW,
    );

    expect(await getTicketOwnerByToken(issued.token ?? "")).toEqual({
      id: issued.ticketId,
      customerId: fixture.customer.id,
    });
    expect(await getTicketOwnerByToken("unknown-token")).toBeNull();
  });
});
