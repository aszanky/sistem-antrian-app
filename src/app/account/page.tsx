import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountOverview } from "@/lib/account-service";
import { currentCustomerToken } from "@/lib/customer-session";
import { ResendVerification, SignOutButton } from "./AccountActions";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  WAITING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
  CALLED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300",
  SERVED:
    "border-stone-200 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300",
  EXPIRED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
};

export default async function AccountPage() {
  const token = await currentCustomerToken();
  if (!token) redirect("/account/login");

  const overview = await getAccountOverview(token);
  if (!overview) redirect("/account/login");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h10M4 17h7" />
            </svg>
          </span>
          <span className="text-sm font-semibold tracking-tight">Antrian</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-stone-500 sm:inline dark:text-stone-400">
            {overview.customer.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
          My tickets
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Queue tickets
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Active tickets and anything served or expired in the last 30 days.
        </p>
        <Link
          href="/q"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Browse queues
          <span aria-hidden>→</span>
        </Link>
      </div>

      {!overview.customer.emailVerified ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Verify your email so you never lose access to your tickets.
          </p>
          <ResendVerification />
        </div>
      ) : null}

      {overview.tickets.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
          <p className="text-lg font-medium">No tickets yet</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Open a business&apos;s queue page and take a number. It will appear
            here automatically.
          </p>
        </section>
      ) : (
        <ul className="mt-8 grid gap-3">
          {overview.tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/account/tickets/${ticket.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-emerald-800"
              >
                <div>
                  <p className="text-sm font-semibold">{ticket.businessName}</p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    Ticket number
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-2xl font-semibold tabular-nums">
                    {ticket.number}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${BADGE[ticket.status] ?? BADGE.EXPIRED}`}
                  >
                    {ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}
                  </span>
                  <span aria-hidden className="text-stone-400">
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
