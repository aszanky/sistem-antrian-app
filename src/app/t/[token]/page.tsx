import { notFound, redirect } from "next/navigation";
import { TicketScreen } from "@/components/TicketScreen";
import { resolveCustomerSession } from "@/lib/customer-auth";
import { currentCustomerToken } from "@/lib/customer-session";
import {
  getTicketOwnerByToken,
  getTicketViewForCustomer,
} from "@/lib/ticket-service";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const owner = await getTicketOwnerByToken(token);
  if (!owner) notFound();

  const sessionToken = await currentCustomerToken();
  if (!sessionToken) {
    redirect(
      `/account/login?next=${encodeURIComponent(`/t/${encodeURIComponent(token)}`)}`,
    );
  }
  const session = await resolveCustomerSession(sessionToken);
  if (!session) {
    redirect(
      `/account/login?next=${encodeURIComponent(`/t/${encodeURIComponent(token)}`)}`,
    );
  }
  if (!owner.customerId || owner.customerId !== session.customer.id) {
    notFound();
  }

  const view = await getTicketViewForCustomer(owner.id, sessionToken);
  if (!view.view) notFound();

  return <TicketScreen ticketId={owner.id} initial={view.view} />;
}
