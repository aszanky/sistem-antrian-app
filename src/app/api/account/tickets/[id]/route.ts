import { NextResponse } from "next/server";
import { currentCustomerToken } from "@/lib/customer-session";
import { errorResponse } from "@/lib/http";
import { getTicketViewForCustomer } from "@/lib/ticket-service";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionToken = await currentCustomerToken();
    if (!sessionToken) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401, headers: PRIVATE_HEADERS },
      );
    }

    const { id } = await params;
    const result = await getTicketViewForCustomer(id, sessionToken);
    if (!result.authenticated) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401, headers: PRIVATE_HEADERS },
      );
    }
    if (!result.view) {
      return NextResponse.json(
        { error: "TICKET_NOT_FOUND" },
        { status: 404, headers: PRIVATE_HEADERS },
      );
    }
    return NextResponse.json(result.view, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
