import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { getTicketView } from "@/lib/ticket-service";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const view = await getTicketView(token);
    if (!view) {
      return NextResponse.json(
        { error: "TICKET_NOT_FOUND" },
        { status: 404, headers: PRIVATE_HEADERS },
      );
    }
    return NextResponse.json(view, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return errorResponse(error);
  }
}
