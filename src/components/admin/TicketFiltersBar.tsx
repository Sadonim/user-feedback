'use client';

import { Button } from '@/components/ui/button';
import type { TicketFiltersInput } from '@/lib/validators/feedback';

interface TicketFiltersBarProps {
  filters: TicketFiltersInput;
  onChange: (filters: Partial<TicketFiltersInput>) => void;
}

export function TicketFiltersBar({ filters, onChange }: TicketFiltersBarProps) {
  const hasActiveFilters =
    filters.status !== undefined ||
    filters.type !== undefined ||
    filters.priority !== undefined;

  return (
    /* TBL-08: role="search" makes filter controls discoverable via landmark navigation */
    <div role="search" aria-label="Filter tickets" className="flex flex-wrap items-center gap-2">
      {/* TBL-05: each select has an accessible label */}
      <select
        aria-label="Filter by status"
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({ status: (e.target.value as TicketFiltersInput['status']) || undefined })
        }
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
      >
        <option value="">All Statuses</option>
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
      </select>

      <select
        aria-label="Filter by type"
        value={filters.type ?? ''}
        onChange={(e) =>
          onChange({ type: (e.target.value as TicketFiltersInput['type']) || undefined })
        }
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
      >
        <option value="">All Types</option>
        <option value="BUG">Bug</option>
        <option value="FEATURE">Feature</option>
        <option value="GENERAL">General</option>
      </select>

      <select
        aria-label="Sort order"
        value={`${filters.sort}-${filters.order}`}
        onChange={(e) => {
          const [sort, order] = e.target.value.split('-') as [
            TicketFiltersInput['sort'],
            TicketFiltersInput['order']
          ];
          onChange({ sort, order });
        }}
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
      >
        <option value="createdAt-desc">Newest First</option>
        <option value="createdAt-asc">Oldest First</option>
        <option value="updatedAt-desc">Recently Updated</option>
      </select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({
              status: undefined,
              type: undefined,
              priority: undefined,
              page: 1,
            })
          }
        >
          Clear Filters
        </Button>
      )}
    </div>
  );
}
