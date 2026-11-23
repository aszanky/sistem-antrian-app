import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/account-service";
import { readJson, sameOrigin } from "@/lib/http";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const gate = rateLimit(`reset:${clientAddress(request)}`, 5, 10 * 60_000);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
    );
  }

  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email : null;
  if (!email) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  await requestPasswordReset(email);
  return NextResponse.json(
    { ok: true },
    { status: 202 },
  );
}
