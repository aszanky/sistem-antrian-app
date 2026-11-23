import { cookies } from "next/headers";
import {
  CUSTOMER_SESSION_COOKIE,
  resolveCustomerSession,
} from "./customer-auth";

export async function currentCustomerToken() {
  const store = await cookies();
  return store.get(CUSTOMER_SESSION_COOKIE)?.value;
}

export async function currentCustomerSession() {
  return resolveCustomerSession(await currentCustomerToken());
}
