import Link from "next/link";

const features = [
  {
    title: "A number in one tap",
    body: "Visitors sign in once and take a number from their own phone. Every ticket stays in their account.",
  },
  {
    title: "Live place in line",
    body: "The ticket page refreshes on its own, showing position, then the counter to walk up to.",
  },
  {
    title: "One console, many counters",
    body: "Staff pick a counter, call the oldest waiting ticket, and mark it served. Concurrent calls never collide.",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_-10%,_var(--color-emerald-200),_transparent)] dark:bg-[radial-gradient(60%_50%_at_50%_-10%,_var(--color-emerald-900),_transparent)]"
      />
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h10M4 17h7" />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-tight">Antrian</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              My tickets
            </Link>
            <Link
              href="/staff/login"
              className="rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-sm font-medium text-stone-700 backdrop-blur transition hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:text-white"
            >
              Staff sign in
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Walk-in queues without the paper
            </span>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl dark:text-white">
              Take a number.
              <br />
              <span className="text-emerald-600 dark:text-emerald-400">Skip the chaos.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-stone-600 dark:text-stone-400">
              Visitors sign in once, take a numbered ticket, and keep it in
              their account. Staff call the next number from a shared console.
              Everyone sees the same live queue.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/q"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-[0.99]"
              >
                Browse queues
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/staff/login"
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 transition hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              >
                Open staff console
              </Link>
            </div>
            <p className="mt-5 text-sm text-stone-500 dark:text-stone-500">
              Create an account once. Tickets stay with you on any device.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rotate-3 rounded-[2.5rem] bg-emerald-200/50 blur-2xl dark:bg-emerald-900/40"
            />
            <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl shadow-stone-300/40 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/40">
              <div className="flex items-center justify-between border-b border-dashed border-stone-200 px-6 py-4 dark:border-stone-700">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  Example business
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Waiting
                </span>
              </div>
              <div className="px-6 py-7 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                  Your number
                </p>
                <p className="mt-2 font-mono text-7xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-white">
                  042
                </p>
                <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                  3 people ahead of you
                </p>
              </div>
              <div className="mx-6 mb-6 rounded-2xl border border-dashed border-stone-200 px-4 py-3 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                Saved to your account. Updates itself.
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-4 pb-12 sm:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-stone-200/80 bg-white/70 p-5 backdrop-blur dark:border-stone-800 dark:bg-stone-900/60"
            >
              <h2 className="text-sm font-semibold text-stone-900 dark:text-white">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {feature.body}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
