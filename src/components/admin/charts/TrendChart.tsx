'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendDataPoint } from '@/types';

interface TrendChartProps {
  data: TrendDataPoint[];
  granularity: 'day' | 'week';
}

function formatDate(dateStr: string, granularity: 'day' | 'week'): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  if (granularity === 'week') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

interface TooltipPayload {
  value: number;
  payload: TrendDataPoint;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {count} submission{count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function TrendChart({ data, granularity }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-xl border bg-muted/20 text-sm text-muted-foreground"
        role="img"
        aria-label="Submission trend chart — no data for this period"
      >
        No data for this period
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    label: formatDate(d.date, granularity),
  }));

  return (
    <figure
      role="img"
      aria-label={`Submission trend over ${data.length} ${granularity}s`}
    >
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={formattedData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#trendGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Accessible fallback table */}
      <table className="sr-only">
        <caption>Submission trend data</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
