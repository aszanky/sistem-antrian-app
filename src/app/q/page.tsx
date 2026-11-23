import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/account/AccountActions";
import { getQueueDirectory } from "@/lib/account-service";
import { currentCustomerToken } from "@/lib/customer-session";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  WAITING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
  CALLED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300",
};

export default async function QueueDirectoryPage() {
  const token = await currentCustomerToken();
  if (!token) redirect("/account/login?next=%2Fq");

  const businesses = await getQueueDirectory(token);
  if (!businesses) redirect("/account/login?next=%2Fq");

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
          <Link
            href="/account"
            className="text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
          >
            My tickets
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
          Available queues
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Choose a business
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Your ticket is tied to the business you pick. If you already have an
          active ticket there, we show it instead of issuing another number.
        </p>
      </div>

      {businesses.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
          <p className="text-lg font-medium">No businesses yet</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Ask the business for its queue link, or check back later.
          </p>
        </section>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {businesses.map((business) => (
            <li key={business.id}>
              <article className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold">{business.name}</h2>
                    {business.activeTicket ? (
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE[business.activeTicket.status] ?? BADGE.WAITING}`}
                      >
                        {business.activeTicket.status === "WAITING"
                          ? "Waiting"
                          : "Called"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {business.activeTicket
                      ? `You hold ticket ${business.activeTicket.number} here today.`
                      : "No active ticket at this business today."}
                  </p>
                </div>

                {business.activeTicket ? (
                  <Link
                    href={`/account/tickets/${business.activeTicket.id}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    View ticket {business.activeTicket.number}
                    <span aria-hidden>→</span>
                  </Link>
                ) : (
                  <Link
                    href={`/q/${business.slug}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-800 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-stone-700 dark:text-stone-200 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
                  >
                    Take a number
                    <span aria-hidden>→</span>
                  </Link>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
