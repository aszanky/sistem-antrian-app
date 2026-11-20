import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { formatNumber } from "@/lib/time";
import { serveTicketForSession } from "@/lib/queue-service";
import { currentSession } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticket = await serveTicketForSession(session, id);
    return NextResponse.json({
      ticket: {
        id: ticket.id,
        number: formatNumber(ticket.seq),
        status: ticket.status,
        servedAt: ticket.servedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
