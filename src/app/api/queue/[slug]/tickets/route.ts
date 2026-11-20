import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { issueTicket } from "@/lib/ticket-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const issued = await issueTicket(slug);
    if (!issued) {
      return NextResponse.json(
        { error: "BUSINESS_NOT_FOUND" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { number: issued.number, ticketUrl: `/t/${issued.token}` },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
