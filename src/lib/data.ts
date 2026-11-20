import { prisma } from "./db";

export function listCounters(businessId: string) {
  return prisma.counter.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function findCounter(businessId: string, counterId: string) {
  return prisma.counter.findFirst({ where: { id: counterId, businessId } });
}

export function findTicketForBusiness(businessId: string, ticketId: string) {
  return prisma.ticket.findFirst({ where: { id: ticketId, businessId } });
}
