import Link from "next/link";
import { safeNextPath } from "@/lib/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  const signupHref =
    nextPath === "/account"
      ? "/account/signup"
      : `/account/signup?next=${encodeURIComponent(nextPath)}`;

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,_var(--color-emerald-100),_transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,_var(--color-emerald-950),_transparent)]"
      />
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h10M4 17h7" />
            </svg>
          </span>
          Antrian
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Sign in to see your active tickets and history.
        </p>
        <div className="mt-8">
          <LoginForm nextPath={nextPath} signupHref={signupHref} />
        </div>
      </div>
    </main>
  );
}
