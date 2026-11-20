"use client";

import { useState } from "react";
import { usePolling } from "@/lib/use-polling";

export type ConsoleState = {
  counters: { id: string; name: string }[];
  counterId: string | null;
  currentTicket: {
    id: string;
    number: string;
    calledAt: string | null;
    counterName: string | null;
  } | null;
  waitingCount: number;
};

const MESSAGES: Record<string, string> = {
  COUNTER_BUSY: "Mark the current ticket served before calling again.",
  QUEUE_EMPTY: "No one is waiting right now.",
  COUNTER_REQUIRED: "Choose a counter first.",
  TICKET_NOT_SERVABLE: "That ticket is no longer active at this counter.",
};

type Action = "counter" | "call" | "serve";

function timeOf(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StaffConsole({
  businessName,
  staffEmail,
  initialState,
}: {
  businessName: string;
  staffEmail: string;
  initialState: ConsoleState;
}) {
  const { data, error, refresh } = usePolling(
    async () => {
      const response = await fetch("/api/staff/state", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not refresh the console.");
      return (await response.json()) as ConsoleState;
    },
    {
      intervalMs: 1000,
      isTerminal: () => false,
      initialData: initialState,
    },
  );
  const [pending, setPending] = useState<Action | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function post(url: string, payload: unknown, action: Action) {
    setPending(action);
    setActionError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: payload ? { "content-type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (response.status === 401) {
        window.location.href = "/staff/login";
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        const code = body.error ?? "REQUEST_FAILED";
        setActionError(MESSAGES[code] ?? code);
        return;
      }
      refresh();
    } catch {
      setActionError("Request failed. Check your connection.");
    } finally {
      setPending(null);
    }
  }

  async function signOut() {
    await fetch("/api/staff/logout", { method: "POST" });
    window.location.href = "/staff/login";
  }

  const current = data?.currentTicket ?? null;
  const busy = pending !== null;
  const selectedCounter = data?.counterId ?? "";
  const calledAt = timeOf(current?.calledAt ?? null);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h10M4 17h7" />
            </svg>
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
              Staff console
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-white">
              {businessName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
          <span className="hidden text-sm text-stone-500 sm:inline dark:text-stone-400">
            {staffEmail}
          </span>
          <button
            onClick={signOut}
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            Sign out
          </button>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {error.message} Retrying automatically.
        </p>
      ) : null}

      <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
              Your counter
            </h2>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              Step 1
            </span>
          </div>

          <div className="relative mt-4">
            <select
              value={selectedCounter}
              disabled={busy}
              onChange={(event) => {
                if (event.target.value) {
                  void post(
                    "/api/staff/counter",
                    { counterId: event.target.value },
                    "counter",
                  );
                }
              }}
              className="w-full appearance-none rounded-2xl border border-stone-300 bg-white px-4 py-3 pr-10 text-sm font-medium text-stone-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-white"
            >
              <option value="">Choose a counter</option>
              {data?.counters.map((counter) => (
                <option key={counter.id} value={counter.id}>
                  {counter.name}
                </option>
              ))}
            </select>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          <div className="mt-5 rounded-2xl bg-stone-50 p-5 dark:bg-stone-800/60">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
              Waiting now
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-stone-900 dark:text-white">
              {data?.waitingCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              tickets issued today
            </p>
          </div>

          <button
            onClick={() => void post("/api/staff/call-next", null, "call")}
            disabled={busy || !data?.counterId}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending === "call" ? "Calling…" : "Call next"}
            {pending !== "call" ? <span aria-hidden>→</span> : null}
          </button>
          <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-500">
            Calls the oldest waiting ticket for today. Serve the current one
            before calling again.
          </p>

          {actionError ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
            >
              {actionError}
            </p>
          ) : null}
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-stone-900 p-6 text-white shadow-xl shadow-stone-400/30 dark:shadow-black/40">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_100%_0%,_var(--color-emerald-800),_transparent)]"
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Now serving
              </p>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                  current ? "text-emerald-300" : "text-stone-500"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    current ? "bg-emerald-400" : "bg-stone-600"
                  }`}
                />
                {current ? "At your counter" : "Idle"}
              </span>
            </div>

            {current ? (
              <>
                <p data-testid="current-number" className="mt-4 font-mono text-8xl font-semibold leading-none tracking-tight tabular-nums">
                  {current.number}
                </p>
                <p className="mt-3 text-sm text-stone-400">
                  {current.counterName}
                  {calledAt ? ` · called ${calledAt}` : null}
                </p>
                <button
                  onClick={() =>
                    void post(
                      `/api/staff/tickets/${current.id}/serve`,
                      null,
                      "serve",
                    )
                  }
                  disabled={busy}
                  className="mt-8 w-full rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending === "serve" ? "Serving…" : "Mark served"}
                </button>
              </>
            ) : (
              <div className="my-8 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
                <p className="text-2xl font-medium text-stone-300">
                  No active ticket
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  Pick a counter, then call the next visitor.
                </p>
              </div>
            )}

            <p className="mt-4 text-xs text-stone-500">
              Visitors see this change on their ticket within about a second.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
