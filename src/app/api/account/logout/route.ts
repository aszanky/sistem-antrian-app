import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE_OPTIONS,
  CUSTOMER_SESSION_COOKIE,
  destroyCustomerSession,
} from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  await destroyCustomerSession(
    request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    ...CUSTOMER_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
