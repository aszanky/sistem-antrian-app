"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        setError(
          response.status === 429
            ? "Too many attempts. Try again later."
            : "Could not send the reset email.",
        );
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send the reset email.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,_var(--color-emerald-100),_transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,_var(--color-emerald-950),_transparent)]"
      />
      <div className="w-full max-w-sm">
        <Link
          href="/account/login"
          className="text-sm font-medium text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
        >
          <span aria-hidden>←</span> Back to sign in
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Reset your password
        </h1>
        {sent ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            If an account exists for that email, a reset link is on its way. The
            link expires in one hour.
          </div>
        ) : (
          <form onSubmit={requestReset} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-stone-700 dark:bg-stone-900"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send reset link"}
            </button>
            {error ? (
              <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
