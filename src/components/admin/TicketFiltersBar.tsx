'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { TicketFiltersInput } from '@/lib/validators/feedback';
import type { AssigneeInfo } from '@/types';

interface TicketFiltersBarProps {
  filters: TicketFiltersInput;
  onChange: (filters: Partial<TicketFiltersInput>) => void;
}

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
  const hasActiveFilters =
    filters.status !== undefined ||
    filters.type !== undefined ||
    filters.priority !== undefined ||
    filters.assigneeId !== undefined;

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
        aria-label="Filter by priority"
        value={filters.priority ?? ''}
        onChange={(e) =>
          onChange({ priority: (e.target.value as TicketFiltersInput['priority']) || undefined })
        }
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
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
        className="rounded-lg border bg-background px-3 py-1.5 text-sm"
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
              assigneeId: undefined,
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
