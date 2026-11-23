import Link from "next/link";
import { ResetForm } from "./ResetForm";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token: raw } = await searchParams;
  const token = Array.isArray(raw) ? raw[0] : raw;

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
          Choose a new password
        </h1>
        {token ? (
          <ResetForm token={token} />
        ) : (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            This reset link is missing its token. Request a new link from the
            sign-in page.
          </p>
        )}
      </div>
    </main>
  );
}
