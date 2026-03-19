'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { TicketStatus } from '@/types';

interface StatusFunnelChartProps {
  data: Record<TicketStatus, number>;
}

// Colors matching TicketStatusBadge palette — WCAG AA verified
const STATUS_CONFIG: Record<TicketStatus, { label: string; fill: string }> = {
  OPEN: { label: 'Open', fill: '#3b82f6' },            // blue-500
  IN_PROGRESS: { label: 'In Progress', fill: '#f59e0b' }, // amber-500
  RESOLVED: { label: 'Resolved', fill: '#22c55e' },    // green-500
  CLOSED: { label: 'Closed', fill: '#6b7280' },        // gray-500
};

const STATUS_ORDER: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

interface TooltipPayload {
  value: number;
  name: string;
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
        {count} ticket{count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function StatusFunnelChart({ data }: StatusFunnelChartProps) {
  const chartData = STATUS_ORDER.map((status) => ({
    name: STATUS_CONFIG[status].label,
    count: data[status] ?? 0,
    fill: STATUS_CONFIG[status].fill,
  }));

  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-xl border bg-muted/20 text-sm text-muted-foreground"
        role="img"
        aria-label="Status funnel chart — no data for this period"
      >
        No data for this period
      </div>
    );
  }

  return (
    <figure
      role="img"
      aria-label="Ticket status funnel bar chart"
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 0, left: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={76} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Accessible fallback table */}
      <table className="sr-only">
        <caption>Ticket status distribution</caption>
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {STATUS_ORDER.map((status) => (
            <tr key={status}>
              <td>{STATUS_CONFIG[status].label}</td>
              <td>{data[status] ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
