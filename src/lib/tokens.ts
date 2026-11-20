import { createHash, randomBytes } from "node:crypto";

export function newPublicToken(): string {
  return randomBytes(16).toString("base64url");
}

export function publicTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
