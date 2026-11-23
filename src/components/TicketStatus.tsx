"use client";

import { usePolling } from "@/lib/use-polling";

type TicketView = {
  number: string;
  status: "WAITING" | "CALLED" | "SERVED" | "EXPIRED";
  position: number | null;
  counterName: string | null;
  businessName: string;
  calledAt: string | null;
  servedAt: string | null;
};

const TERMINAL: TicketView["status"][] = ["SERVED", "EXPIRED"];
const STEPS = ["Issued", "Called", "Served"];

const BADGE: Record<TicketView["status"], string> = {
  WAITING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
  CALLED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300",
  SERVED:
    "border-stone-200 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300",
  EXPIRED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
};

const LABEL: Record<TicketView["status"], string> = {
  WAITING: "Waiting",
  CALLED: "Called",
  SERVED: "Served",
  EXPIRED: "Expired",
};

function formatTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketStatus({
  ticketId,
  initial,
}: {
  ticketId: string;
  initial: TicketView;
}) {
  const { data, error } = usePolling(
    async () => {
      const response = await fetch(
        `/api/account/tickets/${encodeURIComponent(ticketId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Could not refresh the ticket.");
      return (await response.json()) as TicketView;
    },
    {
      intervalMs: 1000,
      isTerminal: (value) => TERMINAL.includes(value.status),
      initialData: initial,
    },
  );

  if (!data) {
    return <p className="text-sm text-stone-500">{error?.message}</p>;
  }

  const terminal = TERMINAL.includes(data.status);
  const stepIndex =
    data.status === "CALLED" ? 1 : data.status === "SERVED" ? 2 : 0;
  const servedAt = formatTime(data.servedAt);
  const calledAt = formatTime(data.calledAt);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl shadow-stone-300/40 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/40">
      <div
        className={`h-1.5 w-full ${
          data.status === "CALLED"
            ? "bg-emerald-500"
            : data.status === "WAITING"
              ? "bg-amber-400"
              : "bg-stone-300 dark:bg-stone-700"
        }`}
      />
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
              Ticket number
            </p>
            <p data-testid="ticket-number" className="mt-1 font-mono text-6xl font-semibold leading-none tracking-tight tabular-nums text-stone-900 sm:text-7xl dark:text-white">
              {data.number}
            </p>
          </div>
          <span
            data-testid="ticket-status"
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${BADGE[data.status]}`}
          >
            {LABEL[data.status]}
          </span>
        </div>

        <div className="my-7 border-t border-dashed border-stone-300 dark:border-stone-700" />

        <div aria-live="polite">
          {data.status === "WAITING" ? (
            <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl bg-stone-50 p-5 dark:bg-stone-800/60">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                  Ahead of you
                </p>
                <p className="mt-1 text-4xl font-semibold tabular-nums text-stone-900 dark:text-white">
                  {data.position ?? 0}
                </p>
              </div>
              <div className="flex items-center rounded-2xl border border-dashed border-stone-300 px-5 py-4 dark:border-stone-700">
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  Keep this page open. When it is your turn, the counter to
                  visit will appear here.
                </p>
              </div>
            </div>
          ) : null}

          {data.status === "CALLED" ? (
            <div className="rounded-2xl bg-emerald-600 p-6 text-white shadow-lg shadow-emerald-600/20">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                Please proceed to
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {data.counterName ?? "the counter"}
              </p>
              {calledAt ? (
                <p className="mt-2 text-sm text-emerald-100">
                  Called at {calledAt}
                </p>
              ) : null}
            </div>
          ) : null}

          {data.status === "SERVED" ? (
            <div className="rounded-2xl bg-stone-100 p-6 dark:bg-stone-800/70">
              <p className="text-2xl font-semibold text-stone-900 dark:text-white">
                All done — thanks!
              </p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                {servedAt ? `Served at ${servedAt}.` : "You have been served."}
              </p>
            </div>
          ) : null}

          {data.status === "EXPIRED" ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/40">
              <p className="text-xl font-semibold text-red-800 dark:text-red-200">
                This ticket has expired
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                It belongs to a previous business day and can no longer be
                called.
              </p>
            </div>
          ) : null}
        </div>

        {data.status !== "EXPIRED" ? (
          <ol className="mt-7 grid grid-cols-3 gap-2">
            {STEPS.map((step, index) => (
              <li key={step}>
                <div
                  className={`h-1 rounded-full ${
                    index <= stepIndex
                      ? "bg-emerald-500"
                      : "bg-stone-200 dark:bg-stone-700"
                  }`}
                />
                <p
                  className={`mt-2 text-xs font-medium ${
                    index <= stepIndex
                      ? "text-stone-900 dark:text-white"
                      : "text-stone-400 dark:text-stone-500"
                  }`}
                >
                  {step}
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          {terminal ? (
            <>
              <span className="size-1.5 rounded-full bg-stone-400" />
              Final state — no more updates
            </>
          ) : (
            <>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Updating live
            </>
          )}
        </div>
      </div>
    </section>
  );
}
