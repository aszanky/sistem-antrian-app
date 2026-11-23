import { describe, expect, it, vi } from "vitest";
import { POST as loginRoute } from "@/app/api/account/login/route";
import { POST as signupRoute } from "@/app/api/account/signup/route";
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  resolveCustomerSession,
  signUpCustomer,
} from "@/lib/customer-auth";
import { resolveSession } from "@/lib/auth";
import { loginCustomer, registerCustomer } from "@/lib/account-service";
import { prisma } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { createCustomer, unique } from "./helpers";

describe("customer signup and sessions", () => {
  it("normalizes email and rejects duplicates or weak passwords", async () => {
    const email = `${unique("person")}@Example.Test`;
    const { customer } = await signUpCustomer(email, "password1");

    expect(customer.email).toBe(email.trim().toLowerCase());
    await expect(
      signUpCustomer(email.toUpperCase(), "password1"),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    await expect(
      signUpCustomer(`${unique("weak")}@test.local`, "short"),
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD" });
    await expect(
      signUpCustomer("not-an-email", "password1"),
    ).rejects.toMatchObject({ code: "INVALID_EMAIL" });

    expect(
      await prisma.customerUser.count({ where: { email: customer.email } }),
    ).toBe(1);
  });

  it("signs in with valid credentials and rejects invalid ones", async () => {
    const email = `${unique("login")}@test.local`;
    const customer = await createCustomer(email, "password1");

    expect(
      (await loginCustomer(email, "password1")).customer.id,
    ).toBe(customer.id);
    await expect(
      loginCustomer(email, "wrong-password"),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(
      loginCustomer("nobody@test.local", "password1"),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("expires sessions after 30 days and extends them near expiry", async () => {
    const customer = await createCustomer();
    const now = new Date("2026-05-01T00:00:00Z");
    const { token, session } = await createCustomerSession(customer.id, now);
    const days = (session.expiresAt.getTime() - now.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);

    await prisma.customerSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(now.getTime() + 86_400_000) },
    });
    const extended = await resolveCustomerSession(token, now);
    const extendedDays =
      ((extended?.expiresAt.getTime() ?? 0) - now.getTime()) / 86_400_000;
    expect(Math.round(extendedDays)).toBe(30);

    await prisma.customerSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(now.getTime() - 1000) },
    });
    expect(await resolveCustomerSession(token, now)).toBeNull();
  });

  it("keeps customer and staff sessions separate", async () => {
    const customer = await createCustomer();
    const { token } = await createCustomerSession(customer.id);

    expect(await resolveSession(token)).toBeNull();
    expect(await resolveCustomerSession("staff-only-token")).toBeNull();
  });

  it("sets a hardened 30-day customer cookie on signup", async () => {
    const response = await signupRoute(
      new Request("http://localhost/api/account/signup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.50",
        },
        body: JSON.stringify({
          email: `${unique("cookie")}@test.local`,
          password: "password1",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const cookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith(`${CUSTOMER_SESSION_COOKIE}=`));
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toContain("Max-Age=2592000");
    expect(cookie).toContain("Path=/");
  });

  it("rate limits repeated login attempts", async () => {
    resetRateLimits();
    const ip = "203.0.113.77";
    let lastStatus = 0;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await loginRoute(
        new Request("http://localhost/api/account/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({
            email: "nobody@test.local",
            password: "wrong",
          }),
        }),
      );
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  });

  it("sends a verification email on registration", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const email = `${unique("registered")}@test.local`;
    const { customer } = await registerCustomer(email, "password1");

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(`[mail:dev] to=${customer.email}`),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/account/verify?token="),
    );
    spy.mockRestore();
  });
});
