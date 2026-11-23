"use client";

import { useState } from "react";

export function ResendVerification() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/verify", { method: "POST" });
      if (response.status === 401) {
        window.location.href = "/account/login";
        return;
      }
      setMessage(
        response.ok
          ? "Verification email sent — check your inbox."
          : "Could not send the email. Try again shortly.",
      );
    } catch {
      setMessage("Could not send the email. Try again shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        onClick={resend}
        disabled={pending}
        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:border-amber-400 disabled:opacity-60 dark:border-amber-800 dark:bg-stone-900 dark:text-amber-300"
      >
        {pending ? "Sending…" : "Resend verification"}
      </button>
      {message ? (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{message}</p>
      ) : null}
    </div>
  );
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await fetch("/api/account/logout", { method: "POST" });
    window.location.href = "/account/login";
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
