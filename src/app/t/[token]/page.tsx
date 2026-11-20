import { notFound } from "next/navigation";
import { getTicketView } from "@/lib/ticket-service";
import { TicketStatus } from "./TicketStatus";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const initial = await getTicketView(token);
  if (!initial) notFound();

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/70 via-stone-50 to-stone-50 dark:from-emerald-950/40 dark:via-stone-950 dark:to-stone-950"
      />
      <div className="mb-6 flex items-center justify-between px-1">
        <span className="text-sm font-semibold tracking-tight text-stone-500 dark:text-stone-400">
          {initial.businessName}
        </span>
        <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-medium text-stone-500 backdrop-blur dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          Ticket
        </span>
      </div>
      <TicketStatus token={token} initial={initial} />
      <p className="mt-6 text-center text-xs text-stone-500 dark:text-stone-500">
        Keep this page open. It updates automatically and needs no account.
      </p>
    </main>
  );
}
