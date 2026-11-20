import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/staff/login/route";
import {
  authenticate,
  createSession,
  hashToken,
  resolveSession,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createBusiness, createStaff } from "./helpers";

describe("staff authentication", () => {
  it("accepts valid credentials and rejects wrong or unknown ones", async () => {
    const business = await createBusiness();
    const staff = await createStaff(business.id, undefined, "secret123");

    expect(await authenticate(staff.email, "secret123")).toMatchObject({
      id: staff.id,
      businessId: business.id,
    });
    expect(await authenticate(staff.email, "wrong")).toBeNull();
    expect(await authenticate("nobody@test.local", "secret123")).toBeNull();
  });

  it("stores a hash of the session token, not the token itself", async () => {
    const business = await createBusiness();
    const staff = await createStaff(business.id);
    const { token } = await createSession(staff.id);

    const stored = await prisma.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    expect(stored).not.toBeNull();
    expect(
      await prisma.staffSession.findUnique({ where: { tokenHash: token } }),
    ).toBeNull();
    expect((await resolveSession(token))?.staff.businessId).toBe(business.id);
  });

  it("rejects an expired session", async () => {
    const business = await createBusiness();
    const staff = await createStaff(business.id);
    const { token, session } = await createSession(staff.id);

    await prisma.staffSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await resolveSession(token)).toBeNull();
  });

  it("sets an HttpOnly, Secure, SameSite=Lax session cookie on login", async () => {
    const business = await createBusiness();
    const staff = await createStaff(business.id, undefined, "secret123");

    const response = await login(
      new Request("http://localhost/api/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: staff.email, password: "secret123" }),
      }),
    );

    expect(response.status).toBe(200);
    const cookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith("staff_session="));
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toContain("Max-Age=43200");
    expect(cookie).toContain("Path=/");
  });

  it("rejects a bad password at the login route", async () => {
    const business = await createBusiness();
    const staff = await createStaff(business.id, undefined, "secret123");

    const response = await login(
      new Request("http://localhost/api/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: staff.email, password: "wrong" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toHaveLength(0);
  });
});
