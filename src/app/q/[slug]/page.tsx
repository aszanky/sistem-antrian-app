import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentCustomerSession } from "@/lib/customer-session";
import { prisma } from "@/lib/db";
import { IssueTicket } from "./IssueTicket";

export default async function QueuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!business) notFound();

  const session = await currentCustomerSession();
  if (!session) {
    redirect(`/account/login?next=${encodeURIComponent(`/q/${slug}`)}`);
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_0%,_var(--color-emerald-100),_transparent)] dark:bg-[radial-gradient(70%_55%_at_50%_0%,_var(--color-emerald-950),_transparent)]"
      />
      <div className="w-full max-w-xl">
        <header className="mb-6 flex items-center justify-between px-1">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-stone-700 dark:text-stone-300"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h10M4 17h7" />
              </svg>
            </span>
            Antrian
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/q"
              className="text-xs font-medium text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
            >
              All queues
            </Link>
            <Link
              href="/account"
              className="text-xs font-medium text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
            >
              My tickets
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl shadow-stone-300/30 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/30">
          <div className="border-b border-stone-100 px-6 py-6 sm:px-8 dark:border-stone-800">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              Now open
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
              {business.name}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              Request a number below. The ticket is saved to your account, shows
              your place in line, and tells you which counter to visit.
            </p>
          </div>
          <div className="px-6 py-7 sm:px-8">
            <IssueTicket slug={slug} />
          </div>
        </section>

        <p className="mt-5 text-center text-xs leading-relaxed text-stone-500 dark:text-stone-500">
          Signed in as {session.customer.email}. Your ticket stays in My tickets.
        </p>
      </div>
    </main>
  );
}
