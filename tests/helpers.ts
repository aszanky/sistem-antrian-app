import { hash } from "@node-rs/argon2";
import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { createSession, resolveSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { issueTicket } from "@/lib/ticket-service";

export function unique(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export async function createBusiness(
  overrides: { slug?: string; name?: string; timezone?: string } = {},
) {
  return prisma.business.create({
    data: {
      slug: overrides.slug ?? unique("biz"),
      name: overrides.name ?? "Test Business",
      timezone: overrides.timezone ?? "Asia/Jakarta",
    },
  });
}

export async function createStaff(
  businessId: string,
  email = `${unique("staff")}@test.local`,
  password = "secret123",
) {
  return prisma.staffUser.create({
    data: { businessId, email, passwordHash: await hash(password) },
  });
}

export async function createCounter(
  businessId: string,
  name = unique("Counter"),
) {
  return prisma.counter.create({ data: { businessId, name } });
}

export async function createFixture() {
  const business = await createBusiness();
  const staff = await createStaff(business.id);
  const counter = await createCounter(business.id);
  return { business, staff, counter };
}

export async function loginAs(staffId: string) {
  const { token } = await createSession(staffId);
  const session = await resolveSession(token);
  if (!session) throw new Error("Session did not resolve");
  return { token, session };
}

export async function issueOrThrow(slug: string, now = new Date()) {
  const issued = await issueTicket(slug, now);
  if (!issued) throw new Error(`Could not issue a ticket for ${slug}`);
  return issued;
}

export async function expectQueueError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}
