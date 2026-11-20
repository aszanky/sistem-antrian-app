"use client";

import Link from "next/link";
import { useState } from "react";

type Issued = { number: string; ticketUrl: string };

export function IssueTicket({ slug }: { slug: string }) {
  const [issued, setIssued] = useState<Issued | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function takeNumber() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/queue/${encodeURIComponent(slug)}/tickets`,
        { method: "POST" },
      );
      const body = (await response.json()) as Partial<Issued> & {
        error?: string;
      };
      if (!response.ok || !body.number || !body.ticketUrl) {
        throw new Error(body.error ?? "Could not issue a ticket");
      }
      setIssued({ number: body.number, ticketUrl: body.ticketUrl });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not issue a ticket",
      );
    } finally {
      setPending(false);
    }
  }

  if (issued) {
    return (
      <div aria-live="polite" className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
          Your number
        </p>
        <p data-testid="issued-number" className="mt-2 font-mono text-8xl font-semibold leading-none tracking-tight tabular-nums text-stone-900 dark:text-white">
          {issued.number}
        </p>
        <Link
          href={issued.ticketUrl}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-[0.99]"
        >
          Open my ticket
          <span aria-hidden>→</span>
        </Link>
        <div className="mt-5 rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-left text-xs leading-relaxed text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Keep this link. Anyone holding it can view the ticket, and it updates
          on its own until you are served.
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={takeNumber}
        disabled={pending}
        className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
        {pending ? "Issuing ticket…" : "Take a number"}
      </button>
      <p className="mt-3 text-center text-xs text-stone-500 dark:text-stone-500">
        One tap. No personal details. Works on any phone.
      </p>
      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
