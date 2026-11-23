"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

const MESSAGES: Record<string, string> = {
  WEAK_PASSWORD: "Use a password with at least 8 characters.",
  INVALID_TOKEN: "This reset link is invalid or has expired.",
  RATE_LIMITED: "Too many attempts. Try again later.",
};

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(MESSAGES[body.error ?? ""] ?? "Could not reset the password.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reset the password.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
          Your password has changed and previous sessions were signed out.
        </div>
        <Link
          href="/account/login"
          className="inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Sign in with the new password
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={reset} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
          New password
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-stone-700 dark:bg-stone-900"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </form>
  );
}
