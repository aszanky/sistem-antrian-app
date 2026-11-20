import { describe, expect, it } from "vitest";
import { businessDate, formatNumber, serviceDateValue } from "@/lib/time";

describe("businessDate", () => {
  it("uses the configured timezone instead of the server timezone", () => {
    expect(businessDate(new Date("2026-05-01T16:59:59Z"), "Asia/Jakarta")).toBe(
      "2026-05-01",
    );
    expect(businessDate(new Date("2026-05-01T17:00:00Z"), "Asia/Jakarta")).toBe(
      "2026-05-02",
    );
    expect(businessDate(new Date("2026-05-01T17:00:00Z"), "UTC")).toBe(
      "2026-05-01",
    );
  });

  it("follows the 23-hour spring-forward day boundary", () => {
    expect(
      businessDate(new Date("2026-03-08T04:59:59Z"), "America/New_York"),
    ).toBe("2026-03-07");
    expect(
      businessDate(new Date("2026-03-08T05:00:00Z"), "America/New_York"),
    ).toBe("2026-03-08");
    expect(
      businessDate(new Date("2026-03-09T03:59:59Z"), "America/New_York"),
    ).toBe("2026-03-08");
    expect(
      businessDate(new Date("2026-03-09T04:00:00Z"), "America/New_York"),
    ).toBe("2026-03-09");
  });

  it("rejects an unknown timezone", () => {
    expect(() => businessDate(new Date(), "Not/AZone")).toThrow(RangeError);
  });
});

describe("ticket formatting", () => {
  it("pads to three digits and grows beyond 999", () => {
    expect(formatNumber(1)).toBe("001");
    expect(formatNumber(42)).toBe("042");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1000)).toBe("1000");
  });

  it("stores a service date at UTC midnight", () => {
    expect(serviceDateValue("2026-05-01").toISOString()).toBe(
      "2026-05-01T00:00:00.000Z",
    );
  });
});
