import Link from "next/link";
import { TicketStatus } from "@/components/TicketStatus";
import type { TicketView } from "@/lib/ticket-service";

export function TicketScreen({
  ticketId,
  initial,
}: {
  ticketId: string;
  initial: TicketView;
}) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/70 via-stone-50 to-stone-50 dark:from-emerald-950/40 dark:via-stone-950 dark:to-stone-950"
      />
      <div className="mb-6 flex items-center justify-between gap-3 px-1">
        <Link
          href="/account"
          className="text-sm font-medium text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
        >
          <span aria-hidden>←</span> My tickets
        </Link>
        <span className="text-sm font-semibold tracking-tight text-stone-500 dark:text-stone-400">
          {initial.businessName}
        </span>
      </div>
      <TicketStatus ticketId={ticketId} initial={initial} />
      <p className="mt-6 text-center text-xs text-stone-500 dark:text-stone-500">
        This ticket is saved to your account. Keep the page open for live
        updates.
      </p>
    </main>
  );
}
