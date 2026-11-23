import { NextResponse } from "next/server";
import { currentCustomerToken } from "@/lib/customer-session";
import { errorResponse, sameOrigin } from "@/lib/http";
import { issueTicketForCustomer } from "@/lib/ticket-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const sessionToken = await currentCustomerToken();
  if (!sessionToken) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const issued = await issueTicketForCustomer(slug, sessionToken);
    return NextResponse.json(
      {
        number: issued.number,
        ticketUrl: issued.reused
          ? `/account/tickets/${issued.ticketId}`
          : `/t/${issued.token}`,
        reused: issued.reused,
      },
      { status: issued.reused ? 200 : 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
