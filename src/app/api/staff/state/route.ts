import { NextResponse } from "next/server";
import { loadStaffConsole } from "@/lib/console-service";
import { currentSessionToken } from "@/lib/session";

export async function GET() {
  const token = await currentSessionToken();
  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const state = await loadStaffConsole(token);
  if (!state) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json(
    {
      counters: state.counters,
      counterId: state.counterId,
      currentTicket: state.currentTicket,
      waitingCount: state.waitingCount,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
