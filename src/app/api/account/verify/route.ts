import { NextResponse } from "next/server";
import { resendVerification } from "@/lib/account-service";
import { currentCustomerSession } from "@/lib/customer-session";
import { errorResponse, sameOrigin } from "@/lib/http";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const session = await currentCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const gate = rateLimit(
    `verify:${session.customer.id}:${clientAddress(request)}`,
    3,
    10 * 60_000,
  );
  if (!gate.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
    );
  }

  try {
    await resendVerification(session.customer);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
