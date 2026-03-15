import type { Metadata } from 'next';
import { prisma } from '@/server/db/prisma';
import { getTicketStats } from '@/server/services/ticket-stats';
import { StatsCard } from '@/components/admin/StatsCard';
import { TypeBreakdownCard } from '@/components/admin/TypeBreakdownCard';
import { RecentActivityCard } from '@/components/admin/RecentActivityCard';
import { RecentTicketsTable } from '@/components/admin/RecentTicketsTable';
import {
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { TicketListItem } from '@/types';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const [stats, recentTickets] = await Promise.all([
    getTicketStats(),
    prisma.feedback.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
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
    }) as Promise<TicketListItem[]>,
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Total" value={stats.total} icon={Inbox} />
        <StatsCard
          title="Open"
          value={stats.byStatus.OPEN}
          icon={AlertCircle}
          color="blue"
        />
        <StatsCard
          title="In Progress"
          value={stats.byStatus.IN_PROGRESS}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Resolved"
          value={stats.byStatus.RESOLVED}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TypeBreakdownCard byType={stats.byType} />
        <RecentActivityCard
          today={stats.recent.today}
          thisWeek={stats.recent.thisWeek}
        />
      </div>

      <RecentTicketsTable tickets={recentTickets} />
    </div>
  );
}
