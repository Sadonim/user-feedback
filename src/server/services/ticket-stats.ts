import { prisma } from '@/server/db/prisma';
import type { TicketStats } from '@/types';

// H1 fix: single source of truth for stats — both stats/route.ts and
// dashboard/page.tsx import from here to prevent copy-paste drift.
export async function getTicketStats(): Promise<TicketStats> {
  const now = new Date();

  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysToMonday);

  // Run all queries in parallel — Prisma 5 groupBy requires orderBy
  const [statusGroups, typeGroups, total, todayCount, weekCount] =
    await Promise.all([
      prisma.feedback.groupBy({
        by: ['status'],
        _count: { status: true },
        orderBy: { status: 'asc' },
      }),
      prisma.feedback.groupBy({
        by: ['type'],
        _count: { type: true },
        orderBy: { type: 'asc' },
      }),
      prisma.feedback.count(),
      prisma.feedback.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.feedback.count({ where: { createdAt: { gte: weekStart } } }),
    ]);

  const byStatus: TicketStats['byStatus'] = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };
  for (const g of statusGroups) {
    byStatus[g.status] = g._count.status;
  }

  const byType: TicketStats['byType'] = {
    BUG: 0,
    FEATURE: 0,
    GENERAL: 0,
  };
  for (const g of typeGroups) {
    byType[g.type] = g._count.type;
  }

  return {
    total,
    byStatus,
    byType,
    recent: { today: todayCount, thisWeek: weekCount },
  };
}
