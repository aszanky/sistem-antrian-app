import { notFound, redirect } from "next/navigation";
import { TicketScreen } from "@/components/TicketScreen";
import { currentCustomerToken } from "@/lib/customer-session";
import { getTicketViewForCustomer } from "@/lib/ticket-service";

export default async function AccountTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionToken = await currentCustomerToken();
  if (!sessionToken) {
    redirect(
      `/account/login?next=${encodeURIComponent(`/account/tickets/${id}`)}`,
    );
  }

  const result = await getTicketViewForCustomer(id, sessionToken);
  if (!result.authenticated) {
    redirect(
      `/account/login?next=${encodeURIComponent(`/account/tickets/${id}`)}`,
    );
  }
  if (!result.view) notFound();

  return <TicketScreen ticketId={id} initial={result.view} />;
}
