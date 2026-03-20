'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsSummaryCards } from './AnalyticsSummaryCards';
import { TrendChart } from './TrendChart';
import { TypeBreakdownChart } from './TypeBreakdownChart';
import { StatusFunnelChart } from './StatusFunnelChart';
import type { AnalyticsData, TimeseriesDataPoint } from '@/types';

interface AnalyticsDashboardProps {
  initialData: AnalyticsData;
}

type Period = '7d' | '30d' | '90d';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7일',
  '30d': '30일',
  '90d': '90일',
};

const PERIODS: Period[] = ['7d', '30d', '90d'];

const PERIOD_TO_DAYS: Record<Period, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [period, setPeriod] = useState<Period>(initialData.period);
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(newPeriod: Period) {
    if (newPeriod === period) return;
    setPeriod(newPeriod);

    startTransition(async () => {
      try {
        const days = PERIOD_TO_DAYS[newPeriod];
        const res = await fetch(`/api/v1/analytics/timeseries?days=${days}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error ?? '분석 데이터를 불러올 수 없습니다');
          return;
        }

        // Timeseries endpoint returns only trend data — immutably update
        // trend + period, preserving all other summary metrics in state.
        setData((prev) => ({
          ...prev,
          period: newPeriod,
          trend: json.data as TimeseriesDataPoint[],
        }));
      } catch {
        toast.error('네트워크 오류 — 분석 데이터를 새로 고칠 수 없습니다');
      }
    });
  }

  return (
    <div className="space-y-6" aria-busy={isPending}>
      {/* Period selector */}
      <div
        role="group"
        aria-label="분석 기간"
        className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 w-fit"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => handlePeriodChange(p)}
            disabled={isPending}
            aria-pressed={period === p}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              period === p
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
              isPending ? 'opacity-50 cursor-wait' : '',
            ].join(' ')}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Summary metric cards */}
      <AnalyticsSummaryCards data={data} />

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              제출 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={data.trend} granularity={data.granularity} />
          </CardContent>
        </Card>

        {/* Feedback type distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              유형별 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TypeBreakdownChart data={data.typeBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Status funnel — full width */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            상태별 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatusFunnelChart data={data.statusFunnel} />
        </CardContent>
      </Card>
    </div>
  );
}
