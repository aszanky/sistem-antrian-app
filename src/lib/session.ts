import { cookies } from "next/headers";
import { resolveSession, SESSION_COOKIE } from "./auth";

export async function currentSessionToken() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function currentSession() {
  return resolveSession(await currentSessionToken());
}
