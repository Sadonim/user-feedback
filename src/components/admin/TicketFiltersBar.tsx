'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TicketFiltersInput } from '@/lib/validators/feedback';
import type { AssigneeInfo } from '@/types';

interface TicketFiltersBarProps {
  filters: TicketFiltersInput;
  onChange: (filters: Partial<TicketFiltersInput>) => void;
}

const selectClass = cn(
  'h-8 rounded-lg border border-input bg-background px-3 py-1.5 text-sm',
  'text-foreground transition-colors',
  'hover:bg-muted/50',
  'focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'cursor-pointer'
);

export function TicketFiltersBar({ filters, onChange }: TicketFiltersBarProps) {
  const [admins, setAdmins] = useState<AssigneeInfo[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/v1/admin/users');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.success) setAdmins(json.data as AssigneeInfo[]);
      } catch {
        // Non-critical — assignee filter will only show "Unassigned" option
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const activeFilterCount = [
    filters.status,
    filters.type,
    filters.priority,
    filters.assigneeId,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    /* TBL-08: role="search" makes filter controls discoverable via landmark navigation */
    <div role="search" aria-label="Filter tickets" className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Filters:</span>
      </span>

      {/* TBL-05: each select has an accessible label */}
      <select
        aria-label="Filter by status"
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({ status: (e.target.value as TicketFiltersInput['status']) || undefined })
        }
        className={cn(selectClass, filters.status && 'border-primary/50 bg-primary/5 font-medium')}
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
        className={cn(selectClass, filters.type && 'border-primary/50 bg-primary/5 font-medium')}
      >
        <option value="">All Types</option>
        <option value="BUG">Bug</option>
        <option value="FEATURE">Feature</option>
        <option value="GENERAL">General</option>
      </select>

      <select
        aria-label="Filter by priority"
        value={filters.priority ?? ''}
        onChange={(e) =>
          onChange({ priority: (e.target.value as TicketFiltersInput['priority']) || undefined })
        }
        className={cn(selectClass, filters.priority && 'border-primary/50 bg-primary/5 font-medium')}
      >
        <option value="">All Priorities</option>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      <select
        aria-label="Filter by assignee"
        value={filters.assigneeId ?? ''}
        onChange={(e) =>
          onChange({
            assigneeId: (e.target.value as TicketFiltersInput['assigneeId']) || undefined,
          })
        }
        className={cn(selectClass, filters.assigneeId && 'border-primary/50 bg-primary/5 font-medium')}
      >
        <option value="">All Assignees</option>
        <option value="unassigned">Unassigned</option>
        {admins.map((admin) => (
          <option key={admin.id} value={admin.id}>
            {admin.username}
          </option>
        ))}
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
        className={selectClass}
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
              assigneeId: undefined,
              page: 1,
            })
          }
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" aria-hidden="true" />
          Clear
          <span
            className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums"
            aria-label={`${activeFilterCount} active filters`}
          >
            {activeFilterCount}
          </span>
        </Button>
      )}
    </div>
  );
}
