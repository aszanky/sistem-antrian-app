export function businessDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => {
    const value = parts.find((entry) => entry.type === type)?.value;
    if (!value) throw new RangeError(`Unable to derive ${type} for ${timeZone}`);
    return value;
  };
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function serviceDateValue(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatNumber(seq: number): string {
  return String(seq).padStart(3, "0");
}
