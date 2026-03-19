import { Activity, Clock, TrendingDown, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AnalyticsData } from '@/types';

interface AnalyticsSummaryCardsProps {
  data: AnalyticsData;
}

function formatAvgTime(hours: number | null): string {
  if (hours === null || hours === undefined) return 'N/A';
  if (hours < 1) return '< 1 hr';
  return `${hours.toFixed(1)} hrs`;
}

function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  subtitle?: string;
}

function SummaryCard({ title, value, icon: Icon, iconColor, subtitle }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon aria-hidden="true" className={cn('size-4', iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsSummaryCards({ data }: AnalyticsSummaryCardsProps) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      role="region"
      aria-label="Analytics summary"
    >
      <SummaryCard
        title="Total Submissions"
        value={String(data.total)}
        icon={Activity}
        iconColor="text-blue-600 dark:text-blue-400"
        subtitle={`Period: ${data.period}`}
      />
      <SummaryCard
        title="Avg Response Time"
        value={formatAvgTime(data.avgResponseTimeHours)}
        icon={Clock}
        iconColor="text-amber-600 dark:text-amber-400"
        subtitle="Time to first resolution"
      />
      <SummaryCard
        title="Open Rate"
        value={formatRate(data.openRate)}
        icon={TrendingDown}
        iconColor="text-red-600 dark:text-red-400"
        subtitle={`${data.statusFunnel.OPEN} tickets still open`}
      />
      <SummaryCard
        title="Resolution Rate"
        value={formatRate(data.resolutionRate)}
        icon={CheckCircle2}
        iconColor="text-green-600 dark:text-green-400"
        subtitle="Resolved + Closed"
      />
    </div>
  );
}
