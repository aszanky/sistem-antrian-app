import { NextResponse } from "next/server";
import { QueueError } from "./errors";

export function errorResponse(error: unknown) {
  if (error instanceof QueueError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}

export async function readJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
