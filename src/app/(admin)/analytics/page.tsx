import type { Metadata } from 'next';
import { getAnalyticsData } from '@/server/services/analytics';
import { AnalyticsDashboard } from '@/components/admin/charts/AnalyticsDashboard';
import type { AnalyticsData } from '@/types';

export const metadata: Metadata = { title: 'Analytics' };

/**
 * Analytics page — React Server Component.
 *
 * Fetches initial data (period=30d, granularity=day) on the server so the
 * page is never empty on first load. Period changes are handled client-side
 * by <AnalyticsDashboard> which re-fetches from the REST API.
 *
 * Architecture note: this RSC must NOT be marked 'use client'. Only the
 * <AnalyticsDashboard> leaf is a client component (period state + re-fetch).
 */
export default async function AnalyticsPage() {
  let initialData: AnalyticsData | null = null;
  let fetchError: string | null = null;

  try {
    initialData = await getAnalyticsData({ period: '30d', granularity: 'day' });
  } catch (err) {
    console.error('[AnalyticsPage] Failed to load initial analytics:', err);
    fetchError = 'Could not load analytics data. Please try again later.';
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      {fetchError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {fetchError}
        </div>
      ) : initialData ? (
        /**
         * <AnalyticsDashboard> is the single client leaf — it owns period state
         * and re-fetches when the user changes the period selector. Initial data
         * is passed as a prop to avoid a flash of empty state.
         */
        <AnalyticsDashboard initialData={initialData} />
      ) : null}
    </div>
  );
}
