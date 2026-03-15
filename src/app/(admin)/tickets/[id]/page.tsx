import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/server/db/prisma';
import { TicketDetailView } from '@/components/admin/TicketDetailView';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ticket = await prisma.feedback.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: ticket ? ticket.title : 'Ticket Not Found' };
}

async function getTicket(id: string) {
  return prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      trackingId: true,
      type: true,
      status: true,
      title: true,
      description: true,
      nickname: true,
      email: true,
      priority: true,
      assigneeId: true,
      createdAt: true,
      updatedAt: true,
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });
}

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;
  const ticket = await getTicket(id);

  if (!ticket) notFound();

  return <TicketDetailView ticket={ticket} />;
}
