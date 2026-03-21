import { prisma } from "@/server/db/prisma";
import type { AnalyticsData, TrendDataPoint, TimeseriesDataPoint } from "@/types";
import type { AnalyticsQueryInput, TimeseriesQueryInput } from "@/lib/validators/feedback";
import type { FeedbackType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Internal types for raw SQL results
// ---------------------------------------------------------------------------

interface TrendRow {
  date: string;
  count: number;
}

interface AvgResponseRow {
  type: FeedbackType;
  avg_hours: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert period string to a start Date relative to now. */
function periodToStartDate(period: "7d" | "30d" | "90d"): Date {
  const days = { "7d": 7, "30d": 30, "90d": 90 }[period];
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/**
 * Fill gaps in trend rows so every date in [startDate, today] has an entry.
 * Pure function — returns new array, never mutates input.
 */
export function fillTrendGaps(
  rows: TrendRow[],
  startDate: Date,
  granularity: "day" | "week"
): TrendDataPoint[] {
  const byDate = new Map<string, number>(rows.map((r) => [r.date, r.count]));
  const result: TrendDataPoint[] = [];

  const cursor = new Date(startDate);
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);

  const stepDays = granularity === "week" ? 7 : 1;

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10); // "YYYY-MM-DD"
    result.push({ date: key, count: byDate.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + stepDays);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Full analytics
// ---------------------------------------------------------------------------

/** Fetch analytics data for the given period + granularity. */
export async function getAnalyticsData(
  input: AnalyticsQueryInput
): Promise<AnalyticsData> {
  const { period, granularity } = input;
  const startDate = periodToStartDate(period);

  const [trendRows, avgRows, statusGroups, typeGroups, total] =
    await Promise.all([
      // Query 1: date-bucketed counts via raw SQL (DATE_TRUNC)
      // Subquery approach: compute date_bucket once so ${granularity} is a
      // single parameter ($1). Avoids PostgreSQL error 42803 that occurs when
      // the same Prisma template variable is used in both SELECT and GROUP BY
      // (each occurrence becomes a separate $N, making them look like different
      // expressions to the planner).
      prisma.$queryRaw<TrendRow[]>`
        SELECT
          TO_CHAR(date_bucket, 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count
        FROM (
          SELECT DATE_TRUNC(${granularity}, "createdAt" AT TIME ZONE 'UTC') AS date_bucket
          FROM "Feedback"
          WHERE "createdAt" >= ${startDate}
        ) sub
        GROUP BY date_bucket
        ORDER BY date_bucket ASC
      `,

      // Query 2: average hours to first resolution per type
      prisma.$queryRaw<AvgResponseRow[]>`
        SELECT
          f.type,
          AVG(
            EXTRACT(EPOCH FROM (sh."createdAt" - f."createdAt")) / 3600.0
          )::float AS avg_hours
        FROM "Feedback" f
        INNER JOIN (
          SELECT DISTINCT ON ("feedbackId") "feedbackId", "createdAt"
          FROM "StatusHistory"
          WHERE "toStatus" IN ('RESOLVED', 'CLOSED')
          ORDER BY "feedbackId", "createdAt" ASC
        ) sh ON sh."feedbackId" = f.id
        WHERE f."createdAt" >= ${startDate}
        GROUP BY f.type
      `,

      // Query 3a: status breakdown
      prisma.feedback.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { status: "asc" },
      }),

      // Query 3b: type breakdown
      prisma.feedback.groupBy({
        by: ["type"],
        _count: { type: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { type: "asc" },
      }),

      // Query 3c: total count
      prisma.feedback.count({ where: { createdAt: { gte: startDate } } }),
    ]);

  // Build statusFunnel
  const statusFunnel: AnalyticsData["statusFunnel"] = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };
  for (const g of statusGroups) {
    statusFunnel[g.status] = g._count.status;
  }

  // Build typeBreakdown
  const typeBreakdown: AnalyticsData["typeBreakdown"] = {
    BUG: 0,
    FEATURE: 0,
    GENERAL: 0,
  };
  for (const g of typeGroups) {
    typeBreakdown[g.type] = g._count.type;
  }

  // Build avgResponseTimeByType
  const avgResponseTimeByType: AnalyticsData["avgResponseTimeByType"] = {
    BUG: null,
    FEATURE: null,
    GENERAL: null,
  };
  let totalAvgSum = 0;
  let totalAvgCount = 0;
  for (const row of avgRows) {
    const hours = row.avg_hours ?? null;
    avgResponseTimeByType[row.type] = hours;
    if (hours !== null) {
      totalAvgSum += hours;
      totalAvgCount += 1;
    }
  }
  const avgResponseTimeHours =
    totalAvgCount > 0 ? totalAvgSum / totalAvgCount : null;

  // Divide-by-zero guard: when total === 0, division yields NaN
  const openRate = total > 0 ? (statusFunnel.OPEN / total) * 100 : 0;
  const resolutionRate =
    total > 0
      ? ((statusFunnel.RESOLVED + statusFunnel.CLOSED) / total) * 100
      : 0;

  const trend = fillTrendGaps(trendRows, startDate, granularity);

  return {
    period,
    granularity,
    startDate: startDate.toISOString(),
    total,
    trend,
    avgResponseTimeHours,
    avgResponseTimeByType,
    statusFunnel,
    typeBreakdown,
    openRate,
    resolutionRate,
  };
}

// ---------------------------------------------------------------------------
// Timeseries (summary endpoint variant)
// ---------------------------------------------------------------------------

/** Daily ticket counts for the last N days, optionally filtered by type. */
export async function getTimeseries(
  input: TimeseriesQueryInput
): Promise<TimeseriesDataPoint[]> {
  const { days, type } = input;

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);
  startDate.setUTCHours(0, 0, 0, 0);

  const rows = type
    ? await prisma.$queryRaw<TrendRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count
        FROM "Feedback"
        WHERE "createdAt" >= ${startDate}
          AND "type" = ${type}::"FeedbackType"
        GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')
        ORDER BY 1 ASC
      `
    : await prisma.$queryRaw<TrendRow[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count
        FROM "Feedback"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE_TRUNC('day', "createdAt" AT TIME ZONE 'UTC')
        ORDER BY 1 ASC
      `;

  return fillTrendGaps(rows, startDate, "day");
}

// ---------------------------------------------------------------------------
// Summary stats (for /analytics/summary endpoint)
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  statusFunnel: AnalyticsData["statusFunnel"];
  typeDist: AnalyticsData["typeBreakdown"];
  priorityDist: Record<string, number>;
  openRate: number;
  resolutionRate: number;
  avgResolutionHours: number | null;
  total: number;
}

/** Aggregate summary stats (all-time, no date filter). */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [statusGroups, typeGroups, priorityGroups, total, avgRows] =
    await Promise.all([
      prisma.feedback.groupBy({
        by: ["status"],
        _count: { status: true },
        orderBy: { status: "asc" },
      }),
      prisma.feedback.groupBy({
        by: ["type"],
        _count: { type: true },
        orderBy: { type: "asc" },
      }),
      prisma.feedback.groupBy({
        by: ["priority"],
        _count: { priority: true },
        orderBy: { priority: "asc" },
      }),
      prisma.feedback.count(),
      prisma.$queryRaw<AvgResponseRow[]>`
        SELECT
          f.type,
          AVG(
            EXTRACT(EPOCH FROM (sh."createdAt" - f."createdAt")) / 3600.0
          )::float AS avg_hours
        FROM "Feedback" f
        INNER JOIN (
          SELECT DISTINCT ON ("feedbackId") "feedbackId", "createdAt"
          FROM "StatusHistory"
          WHERE "toStatus" IN ('RESOLVED', 'CLOSED')
          ORDER BY "feedbackId", "createdAt" ASC
        ) sh ON sh."feedbackId" = f.id
        GROUP BY f.type
      `,
    ]);

  const statusFunnel: AnalyticsSummary["statusFunnel"] = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };
  for (const g of statusGroups) statusFunnel[g.status] = g._count.status;

  const typeDist: AnalyticsSummary["typeDist"] = {
    BUG: 0,
    FEATURE: 0,
    GENERAL: 0,
  };
  for (const g of typeGroups) typeDist[g.type] = g._count.type;

  const priorityDist: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  for (const g of priorityGroups) {
    if (g.priority !== null) priorityDist[g.priority] = g._count.priority;
  }

  let totalAvgSum = 0;
  let totalAvgCount = 0;
  for (const row of avgRows) {
    if (row.avg_hours !== null) {
      totalAvgSum += row.avg_hours;
      totalAvgCount += 1;
    }
  }
  const avgResolutionHours =
    totalAvgCount > 0 ? totalAvgSum / totalAvgCount : null;

  // Divide-by-zero guard
  const openRate = total > 0 ? (statusFunnel.OPEN / total) * 100 : 0;
  const resolutionRate =
    total > 0
      ? ((statusFunnel.RESOLVED + statusFunnel.CLOSED) / total) * 100
      : 0;

  return {
    statusFunnel,
    typeDist,
    priorityDist,
    openRate,
    resolutionRate,
    avgResolutionHours,
    total,
  };
}
