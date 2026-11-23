export function safeNextPath(
  value: string | string[] | undefined,
  fallback = "/account",
) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
