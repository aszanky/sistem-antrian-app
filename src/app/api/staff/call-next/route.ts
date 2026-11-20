import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { callNextForSession } from "@/lib/queue-service";
import { currentSession } from "@/lib/session";
import { formatNumber } from "@/lib/time";

export async function POST() {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const ticket = await callNextForSession(session);
    return NextResponse.json({
      ticket: {
        id: ticket.id,
        number: formatNumber(ticket.seq),
        counterName: ticket.counterName,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
