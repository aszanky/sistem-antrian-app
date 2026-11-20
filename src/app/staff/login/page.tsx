"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setError("Invalid email or password.");
        return;
      }
      router.push("/staff");
    } catch {
      setError("Could not sign in. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.02fr_0.98fr]">
      <aside className="relative hidden overflow-hidden bg-stone-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_20%_0%,_var(--color-emerald-800),_transparent),radial-gradient(40%_35%_at_100%_100%,_var(--color-emerald-950),_transparent)]"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-emerald-950">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h10M4 17h7" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight">Antrian</span>
        </div>

        <div className="relative">
          <h1 className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">
            Keep the line moving.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone-300">
            One shared queue, many counters. Call the next visitor, mark them
            served, and the ticket page updates in front of them.
          </p>
          <div className="mt-10 space-y-2">
            {[
              ["042", "Counter 2", "Serving"],
              ["043", "Counter 1", "Waiting"],
              ["044", "—", "Waiting"],
            ].map(([number, counter, state], index) => (
              <div
                key={number}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                  index === 0
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {number}
                </span>
                <span className="text-stone-400">{counter}</span>
                <span
                  className={
                    index === 0 ? "text-emerald-300" : "text-stone-500"
                  }
                >
                  {state}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-stone-500">
          Every call is attributed to the signed-in staff member and counter.
        </p>
      </aside>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
          >
            <span aria-hidden>←</span> Back to the queue
          </Link>

          <h2 className="mt-8 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
            Staff sign in
          </h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Use the account provided by your business.
          </p>

          <form onSubmit={signIn} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : null}
              {pending ? "Signing in…" : "Sign in"}
            </button>
            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
              >
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
