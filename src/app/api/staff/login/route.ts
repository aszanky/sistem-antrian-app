import { NextResponse } from "next/server";
import {
  authenticate,
  createSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_TTL_SECONDS,
} from "@/lib/auth";
import { readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email : null;
  const password = typeof body?.password === "string" ? body.password : null;
  if (!email || !password) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const staff = await authenticate(email, password);
  if (!staff) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS" },
      { status: 401 },
    );
  }

  const { token } = await createSession(staff.id);
  const response = NextResponse.json({
    ok: true,
    business: { slug: staff.business.slug, name: staff.business.name },
  });
  response.cookies.set(SESSION_COOKIE, token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
