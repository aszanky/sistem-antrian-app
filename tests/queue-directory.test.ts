import { describe, expect, it } from "vitest";
import { getQueueDirectory } from "@/lib/account-service";
import {
  createBusiness,
  createCustomerWithSession,
  issueOrThrow,
} from "./helpers";

const NOW = new Date("2026-05-01T03:00:00Z");
const YESTERDAY = new Date("2026-04-30T03:00:00Z");

describe("queue directory", () => {
  it("lists businesses and maps the customer's active ticket", async () => {
    const bravo = await createBusiness({ name: "Bravo Desk" });
    const alpha = await createBusiness({ name: "Alpha Desk" });
    const account = await createCustomerWithSession();
    const active = await issueOrThrow(bravo.slug, account.token, NOW);
    await issueOrThrow(alpha.slug, account.token, YESTERDAY);

    const directory = await getQueueDirectory(account.token, NOW);
    const entries = (directory ?? []).filter((entry) =>
      [alpha.id, bravo.id].includes(entry.id),
    );

    expect(entries.map((entry) => entry.name)).toEqual([
      "Alpha Desk",
      "Bravo Desk",
    ]);
    expect(
      directory?.find((entry) => entry.id === bravo.id)?.activeTicket,
    ).toEqual({
      id: active.ticketId,
      number: "001",
      status: "WAITING",
    });
    expect(
      directory?.find((entry) => entry.id === alpha.id)?.activeTicket,
    ).toBeNull();
  });

  it("does not map another customer's active ticket", async () => {
    const business = await createBusiness();
    const account = await createCustomerWithSession();
    await issueOrThrow(business.slug, account.token, NOW);
    const other = await createCustomerWithSession();

    const directory = await getQueueDirectory(other.token, NOW);
    expect(
      directory?.find((entry) => entry.id === business.id)?.activeTicket,
    ).toBeNull();
  });

  it("returns null without a valid session", async () => {
    await createBusiness();
    expect(await getQueueDirectory("not-a-session", NOW)).toBeNull();
  });
});
