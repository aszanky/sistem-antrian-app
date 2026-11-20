import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/http";
import { selectCounter } from "@/lib/queue-service";
import { currentSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await readJson(request);
  const counterId =
    typeof body?.counterId === "string" ? body.counterId : null;
  if (!counterId) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const counter = await selectCounter({
      sessionId: session.id,
      businessId: session.staff.businessId,
      counterId,
    });
    return NextResponse.json({ ok: true, counter });
  } catch (error) {
    return errorResponse(error);
  }
}
