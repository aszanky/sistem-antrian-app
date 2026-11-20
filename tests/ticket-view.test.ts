import { describe, expect, it } from "vitest";
import { GET as getTicket } from "@/app/api/tickets/[token]/route";
import { getTicketView } from "@/lib/ticket-service";
import { callNext, serveTicket } from "@/lib/queue-service";
import {
  createFixture,
  issueOrThrow,
} from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");
const YESTERDAY = new Date("2026-04-30T03:00:00Z");

describe("ticket view", () => {
  it("returns the number, waiting status, and position", async () => {
    const { business } = await createFixture();
    const first = await issueOrThrow(business.slug, NOW);
    const second = await issueOrThrow(business.slug, NOW);

    expect(await getTicketView(first.token, NOW)).toMatchObject({
      number: "001",
      status: "WAITING",
      position: 0,
    });
    expect(await getTicketView(second.token, NOW)).toMatchObject({
      number: "002",
      status: "WAITING",
      position: 1,
    });
  });

  it("advances position when earlier tickets are served", async () => {
    const { business, staff, counter } = await createFixture();
    await issueOrThrow(business.slug, NOW);
    const second = await issueOrThrow(business.slug, NOW);
    const third = await issueOrThrow(business.slug, NOW);

    const called = await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );
    await serveTicket(
      {
        businessId: business.id,
        counterId: counter.id,
        ticketId: called.id,
      },
      NOW,
    );

    expect(await getTicketView(second.token, NOW)).toMatchObject({
      status: "WAITING",
      position: 0,
    });
    expect(await getTicketView(third.token, NOW)).toMatchObject({
      status: "WAITING",
      position: 1,
    });
  });

  it("shows the counter once called", async () => {
    const { business, staff, counter } = await createFixture();
    const issued = await issueOrThrow(business.slug, NOW);

    await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      NOW,
    );

    expect(await getTicketView(issued.token, NOW)).toMatchObject({
      status: "CALLED",
      counterName: counter.name,
    });
  });

  it("returns null for an unknown token", async () => {
    expect(await getTicketView("unknown-token", NOW)).toBeNull();
  });

  it("marks a prior-day waiting ticket as expired", async () => {
    const { business } = await createFixture();
    const issued = await issueOrThrow(business.slug, YESTERDAY);

    expect(await getTicketView(issued.token, NOW)).toMatchObject({
      status: "EXPIRED",
      position: null,
    });
  });

  it("keeps a served prior-day ticket readable", async () => {
    const { business, staff, counter } = await createFixture();
    const issued = await issueOrThrow(business.slug, YESTERDAY);
    await callNext(
      { businessId: business.id, counterId: counter.id, staffId: staff.id },
      YESTERDAY,
    );
    await serveTicket(
      {
        businessId: business.id,
        counterId: counter.id,
        ticketId: issued.ticket.id,
      },
      YESTERDAY,
    );

    const view = await getTicketView(issued.token, NOW);
    expect(view?.status).toBe("SERVED");
    expect(view?.servedAt).not.toBeNull();
  });

  it("sets no-store and no-referrer on the ticket route", async () => {
    const { business } = await createFixture();
    const issued = await issueOrThrow(business.slug, NOW);

    const response = await getTicket(
      new Request(`http://localhost/api/tickets/${issued.token}`),
      { params: Promise.resolve({ token: issued.token }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
