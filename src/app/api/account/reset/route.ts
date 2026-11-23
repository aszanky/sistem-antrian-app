import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/account-service";
import { CUSTOMER_COOKIE_OPTIONS, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";
import { errorResponse, readJson, sameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await readJson(request);
  const token = typeof body?.token === "string" ? body.token : null;
  const password = typeof body?.password === "string" ? body.password : null;
  if (!token || !password) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    await resetPassword(token, password);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
      ...CUSTOMER_COOKIE_OPTIONS,
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
