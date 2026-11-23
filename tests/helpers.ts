import { hash } from "@node-rs/argon2";
import { createSession, resolveSession } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import {
  createCustomerSession,
  normalizeEmail,
  resolveCustomerSession,
} from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import { issueTicketForCustomer } from "@/lib/ticket-service";

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

export async function createCustomer(
  email = `${unique("customer")}@test.local`,
  password = "secret123",
) {
  return prisma.customerUser.create({
    data: { email: normalizeEmail(email), passwordHash: await hash(password) },
  });
}

export async function loginCustomerAs(customerId: string) {
  const { token } = await createCustomerSession(customerId);
  const session = await resolveCustomerSession(token);
  if (!session) throw new Error("Customer session did not resolve");
  return { token, session };
}

export async function loginAs(staffId: string) {
  const { token } = await createSession(staffId);
  const session = await resolveSession(token);
  if (!session) throw new Error("Session did not resolve");
  return { token, session };
}

export async function createCustomerWithSession(
  email = `${unique("customer")}@test.local`,
  password = "secret123",
) {
  const customer = await createCustomer(email, password);
  return { customer, ...(await loginCustomerAs(customer.id)) };
}

export async function createFixture() {
  const business = await createBusiness();
  const staff = await createStaff(business.id);
  const counter = await createCounter(business.id);
  const account = await createCustomerWithSession();
  return {
    business,
    staff,
    counter,
    customer: account.customer,
    customerToken: account.token,
    customerSession: account.session,
  };
}

export async function issueOrThrow(
  slug: string,
  sessionToken: string,
  now = new Date(),
) {
  const issued = await issueTicketForCustomer(slug, sessionToken, now);
  return issued;
}

export async function issueTicketsForBusiness(
  slug: string,
  count: number,
  now = new Date(),
) {
  const results = [];
  for (let index = 0; index < count; index += 1) {
    const account = await createCustomerWithSession();
    const issued = await issueOrThrow(slug, account.token, now);
    results.push({ ...issued, customer: account.customer, customerToken: account.token });
  }
  return results;
}

export async function expectQueueError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}
