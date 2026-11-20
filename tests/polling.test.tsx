// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePolling } from "@/lib/use-polling";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("usePolling", () => {
  it("stops scheduling refreshes after a terminal value", async () => {
    vi.useFakeTimers();
    const load = vi
      .fn()
      .mockResolvedValueOnce({ status: "CALLED" })
      .mockResolvedValue({ status: "SERVED" });

    const { result } = renderHook(() =>
      usePolling(load, {
        intervalMs: 3000,
        isTerminal: (value) => value.status === "SERVED",
      }),
    );

    await act(async () => {});
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(load).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual({ status: "SERVED" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
