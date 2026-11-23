import { describe, expect, it, vi } from "vitest";
import {
  requestPasswordReset,
  resetPassword,
  verifyCustomerEmail,
} from "@/lib/account-service";
import { hashToken } from "@/lib/auth";
import { authenticateCustomer, createCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import {
  createEmailToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email-tokens";
import { createCustomer, unique } from "./helpers";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("email verification", () => {
  it("stores only the token hash with a 24-hour expiry", async () => {
    const customer = await createCustomer();
    const token = await sendVerificationEmail(customer, NOW);
    const stored = await prisma.emailToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(token) },
    });

    expect(stored.purpose).toBe("VERIFY");
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.expiresAt.getTime()).toBe(NOW.getTime() + 24 * 60 * 60_000);
  });

  it("verifies once and rejects reuse or expiry", async () => {
    const customer = await createCustomer();
    const token = await sendVerificationEmail(customer, NOW);

    expect(await verifyCustomerEmail(token, NOW)).toBe(true);
    expect(
      (
        await prisma.customerUser.findUniqueOrThrow({
          where: { id: customer.id },
        })
      ).emailVerifiedAt,
    ).not.toBeNull();
    expect(await verifyCustomerEmail(token, NOW)).toBe(false);

    const other = await createCustomer();
    const expired = await createEmailToken(
      other.id,
      "VERIFY",
      new Date(NOW.getTime() - 25 * 60 * 60_000),
    );
    expect(await verifyCustomerEmail(expired.token, NOW)).toBe(false);
  });

  it("logs the verification link when SMTP is not configured", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const customer = await createCustomer();
    const token = await sendVerificationEmail(customer, NOW);

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(`/account/verify?token=${token}`),
    );
    spy.mockRestore();
  });
});

describe("password reset", () => {
  it("responds the same for known and unknown emails", async () => {
    const customer = await createCustomer();
    await expect(
      requestPasswordReset(customer.email, NOW),
    ).resolves.toBeUndefined();
    await expect(
      requestPasswordReset(`${unique("ghost")}@test.local`, NOW),
    ).resolves.toBeUndefined();
  });

  it("changes the password, invalidates sessions, and rejects reuse", async () => {
    const customer = await createCustomer(undefined, "old-password");
    await createCustomerSession(customer.id, NOW);
    await createCustomerSession(customer.id, NOW);
    const token = await sendPasswordResetEmail(customer, NOW);

    await resetPassword(token, "new-password", NOW);

    expect(await authenticateCustomer(customer.email, "old-password")).toBeNull();
    expect(
      (await authenticateCustomer(customer.email, "new-password"))?.id,
    ).toBe(customer.id);
    expect(
      await prisma.customerSession.count({
        where: { customerUserId: customer.id },
      }),
    ).toBe(0);
    await expect(resetPassword(token, "another-pass", NOW)).rejects.toMatchObject(
      { code: "INVALID_TOKEN" },
    );
  });

  it("rejects an expired reset token and a weak password", async () => {
    const customer = await createCustomer();
    const expired = await createEmailToken(
      customer.id,
      "RESET",
      new Date(NOW.getTime() - 2 * 60 * 60_000),
    );
    await expect(
      resetPassword(expired.token, "new-password", NOW),
    ).rejects.toMatchObject({ code: "INVALID_TOKEN" });

    const valid = await sendPasswordResetEmail(customer, NOW);
    await expect(resetPassword(valid, "short", NOW)).rejects.toMatchObject({
      code: "WEAK_PASSWORD",
    });
  });
});
