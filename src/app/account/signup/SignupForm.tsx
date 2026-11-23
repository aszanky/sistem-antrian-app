"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

const MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: "That email already has an account. Sign in instead.",
  WEAK_PASSWORD: "Use a password with at least 8 characters.",
  INVALID_EMAIL: "Enter a valid email address.",
  RATE_LIMITED: "Too many attempts. Try again in a few minutes.",
};

export function SignupForm({
  nextPath,
  loginHref,
}: {
  nextPath: string;
  loginHref: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(MESSAGES[body.error ?? ""] ?? "Could not create the account.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Could not create the account. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={signUp} className="space-y-4">
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
          className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
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
          autoComplete="new-password"
          minLength={8}
          required
          className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
        />
        <span className="mt-1.5 block text-xs text-stone-500 dark:text-stone-500">
          At least 8 characters. You can verify your email later.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}{" "}
          {error.startsWith("That email") ? (
            <Link href={loginHref} className="font-semibold underline">
              Sign in
            </Link>
          ) : null}
        </p>
      ) : null}
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-emerald-700 dark:text-emerald-400">
          Sign in
        </Link>
      </p>
    </form>
  );
}
