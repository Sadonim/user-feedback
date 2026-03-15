import type { Metadata } from 'next';
import { prisma } from '@/server/db/prisma';
import { ticketFiltersSchema } from '@/lib/validators/feedback';
import { TicketListPageContent } from '@/components/admin/TicketListPageContent';
import type { TicketListItem, ApiMeta } from '@/types';

export const metadata: Metadata = { title: 'Tickets' };

interface Props {
  searchParams: Promise<Record<string, string>>;
}

async function fetchTickets(rawParams: Record<string, string>): Promise<{
  items: TicketListItem[];
  meta: ApiMeta;
}> {
  const parsed = ticketFiltersSchema.safeParse(rawParams);
  const filters = parsed.success
    ? parsed.data
    : ticketFiltersSchema.parse({});

  const { page, limit, status, type, priority, sort, order } = filters;
  const where = {
    ...(status && { status }),
    ...(type && { type }),
    ...(priority && { priority }),
  };

  const [total, items] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        trackingId: true,
        type: true,
        status: true,
        title: true,
        nickname: true,
        priority: true,
        assigneeId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    items,
    meta: { total, page, limit, hasNextPage: page * limit < total },
  };
}

export default async function TicketsPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const { items, meta } = await fetchTickets(rawParams);

  const parsed = ticketFiltersSchema.safeParse(rawParams);
  const initialFilters = parsed.success
    ? parsed.data
    : ticketFiltersSchema.parse({});

  return (
    <TicketListPageContent
      initialFilters={initialFilters}
      initialData={items}
      initialMeta={meta}
    />
  );
}
