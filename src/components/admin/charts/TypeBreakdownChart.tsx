'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { FeedbackType } from '@/types';

interface TypeBreakdownChartProps {
  data: Record<FeedbackType, number>;
}

// WCAG AA compliant color pairs (text on background verified ≥ 4.5:1)
const TYPE_COLORS: Record<FeedbackType, { fill: string; label: string }> = {
  BUG: { fill: 'hsl(var(--destructive))', label: 'Bug' },
  FEATURE: { fill: 'hsl(var(--primary))', label: 'Feature' },
  GENERAL: { fill: 'hsl(var(--secondary-foreground))', label: 'General' },
};

const FEEDBACK_TYPES: FeedbackType[] = ['BUG', 'FEATURE', 'GENERAL'];

interface TooltipPayload {
  name: string;
  value: number;
  payload: { total: number };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const total = entry.payload.total;
  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{entry.name}</p>
      <p className="text-muted-foreground">
        {entry.value} tickets ({pct}%)
      </p>
    </div>
  );
}

export function TypeBreakdownChart({ data }: TypeBreakdownChartProps) {
  const total = Object.values(data).reduce((sum, n) => sum + n, 0);

  const chartData = FEEDBACK_TYPES.map((type) => ({
    name: TYPE_COLORS[type].label,
    value: data[type] ?? 0,
    total, // passed through for tooltip %
    fill: TYPE_COLORS[type].fill,
  }));

  if (total === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-xl border bg-muted/20 text-sm text-muted-foreground"
        role="img"
        aria-label="Feedback type distribution chart — no data for this period"
      >
        No data for this period
      </div>
    );
  }

  return (
    <figure
      role="img"
      aria-label="Feedback type distribution pie chart"
    >
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Accessible fallback table */}
      <table className="sr-only">
        <caption>Feedback type distribution</caption>
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {FEEDBACK_TYPES.map((type) => (
            <tr key={type}>
              <td>{TYPE_COLORS[type].label}</td>
              <td>{data[type] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
