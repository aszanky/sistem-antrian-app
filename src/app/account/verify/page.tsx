import Link from "next/link";
import { verifyCustomerEmail } from "@/lib/account-service";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token: raw } = await searchParams;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const verified = token ? await verifyCustomerEmail(token) : false;

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,_var(--color-emerald-100),_transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,_var(--color-emerald-950),_transparent)]"
      />
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-xl dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-2xl font-semibold tracking-tight">
          {verified ? "Email verified" : "Verification link problem"}
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          {verified
            ? "Your account is now verified. Your tickets stay available from any device."
            : "This link is invalid or has expired. Sign in and request a new verification email from your account page."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/account"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go to my tickets
          </Link>
          <Link
            href="/account/login"
            className="rounded-xl border border-stone-300 px-5 py-2.5 text-sm font-semibold dark:border-stone-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
