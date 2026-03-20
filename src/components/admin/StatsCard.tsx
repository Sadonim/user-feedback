import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: 'default' | 'blue' | 'amber' | 'green' | 'red';
  subtitle?: string;
  /** Percentage change vs previous period. Positive = up, negative = down. */
  trend?: number;
}

const colorMap: Record<NonNullable<StatsCardProps['color']>, string> = {
  default: 'text-foreground',
  blue: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
};

const iconBgMap: Record<NonNullable<StatsCardProps['color']>, string> = {
  default: 'bg-muted',
  blue: 'bg-blue-50 dark:bg-blue-900/20',
  amber: 'bg-amber-50 dark:bg-amber-900/20',
  green: 'bg-green-50 dark:bg-green-900/20',
  red: 'bg-red-50 dark:bg-red-900/20',
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  subtitle,
  trend,
}: StatsCardProps) {
  const hasTrend = trend !== undefined;
  const trendUp = hasTrend && trend > 0;
  const trendDown = hasTrend && trend < 0;
  const trendFlat = hasTrend && trend === 0;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn('flex size-8 items-center justify-center rounded-lg', iconBgMap[color])}>
            <Icon className={cn('size-4', colorMap[color])} aria-hidden="true" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className={cn('tabular-nums text-3xl font-bold', colorMap[color])}>{value}</p>
        <div className="mt-1 flex items-center gap-1.5">
          {hasTrend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                trendUp && 'text-green-600 dark:text-green-400',
                trendDown && 'text-red-500 dark:text-red-400',
                trendFlat && 'text-muted-foreground'
              )}
              aria-label={`추세: 이전 대비 ${trend > 0 ? '+' : ''}${trend}%`}
            >
              {trendUp && <TrendingUp className="size-3" aria-hidden="true" />}
              {trendDown && <TrendingDown className="size-3" aria-hidden="true" />}
              {trendFlat && <Minus className="size-3" aria-hidden="true" />}
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
