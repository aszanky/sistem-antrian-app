export class QueueError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message = code,
  ) {
    super(message);
    this.name = "QueueError";
  }
}

export function isUniqueViolation(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    meta?: { code?: string };
    message?: string;
  };
  return (
    candidate?.meta?.code === "23505" ||
    candidate?.code === "23505" ||
    (typeof candidate?.message === "string" && candidate.message.includes("23505"))
  );
}
