import { describe, expect, it } from "vitest";
import { resolveSession } from "@/lib/auth";
import {
  callNextForSession,
  selectCounter,
} from "@/lib/queue-service";
import {
  createBusiness,
  createCounter,
  createFixture,
  expectQueueError,
  loginAs,
} from "./helpers";

describe("counter selection", () => {
  it("stores the selected counter on the session", async () => {
    const { business, staff, counter } = await createFixture();
    const { token, session } = await loginAs(staff.id);

    await selectCounter({
      sessionId: session.id,
      businessId: business.id,
      counterId: counter.id,
    });

    expect((await resolveSession(token))?.counterId).toBe(counter.id);
  });

  it("rejects a counter from another business", async () => {
    const first = await createFixture();
    const second = await createFixture();
    const { session } = await loginAs(first.staff.id);

    await expectQueueError(
      selectCounter({
        sessionId: session.id,
        businessId: first.business.id,
        counterId: second.counter.id,
      }),
      "COUNTER_NOT_FOUND",
    );
  });

  it("rejects calling before a counter is selected", async () => {
    const { business, staff } = await createFixture();

    await expectQueueError(
      callNextForSession({
        counterId: null,
        staffUserId: staff.id,
        staff: {
        businessId: business.id,
        business: { timezone: "Asia/Jakarta" },
      },
      }),
      "COUNTER_REQUIRED",
    );
  });

  it("rejects a staff session using another business's counter", async () => {
    const first = await createFixture();
    const second = await createBusiness();
    const secondCounter = await createCounter(second.id);

    await expectQueueError(
      callNextForSession({
        counterId: secondCounter.id,
        staffUserId: first.staff.id,
        staff: {
        businessId: first.business.id,
        business: { timezone: "Asia/Jakarta" },
      },
      }),
      "COUNTER_NOT_FOUND",
    );
  });
});
