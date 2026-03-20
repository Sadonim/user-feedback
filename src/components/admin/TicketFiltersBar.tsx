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
    <div role="search" aria-label="티켓 필터" className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        <span className="sr-only">필터:</span>
      </span>

      {/* TBL-05: each select has an accessible label */}
      <select
        aria-label="상태로 필터"
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({ status: (e.target.value as TicketFiltersInput['status']) || undefined })
        }
        className={cn(selectClass, filters.status && 'border-primary/50 bg-primary/5 font-medium')}
      >
        <option value="">전체 상태</option>
        <option value="OPEN">접수됨</option>
        <option value="IN_PROGRESS">처리 중</option>
        <option value="RESOLVED">해결됨</option>
        <option value="CLOSED">종료됨</option>
      </select>

      <select
        aria-label="유형으로 필터"
        value={filters.type ?? ''}
        onChange={(e) =>
          onChange({ type: (e.target.value as TicketFiltersInput['type']) || undefined })
        }
        className={cn(selectClass, filters.type && 'border-primary/50 bg-primary/5 font-medium')}
      >
        <option value="">전체 유형</option>
        <option value="BUG">버그</option>
        <option value="FEATURE">기능 요청</option>
        <option value="GENERAL">일반</option>
      </select>

      <select
        aria-label="우선순위로 필터"
        value={filters.priority ?? ''}
        onChange={(e) =>
          onChange({ priority: (e.target.value as TicketFiltersInput['priority']) || undefined })
        }
        className={cn(selectClass, filters.priority && 'border-primary/50 bg-primary/5 font-medium')}
      >
        <option value="">전체 우선순위</option>
        <option value="CRITICAL">긴급</option>
        <option value="HIGH">높음</option>
        <option value="MEDIUM">보통</option>
        <option value="LOW">낮음</option>
      </select>

      <select
        aria-label="담당자로 필터"
        value={filters.assigneeId ?? ''}
        onChange={(e) =>
          onChange({
            assigneeId: (e.target.value as TicketFiltersInput['assigneeId']) || undefined,
          })
        }
        className={cn(selectClass, filters.assigneeId && 'border-primary/50 bg-primary/5 font-medium')}
      >
        <option value="">전체 담당자</option>
        <option value="unassigned">미배정</option>
        {admins.map((admin) => (
          <option key={admin.id} value={admin.id}>
            {admin.username}
          </option>
        ))}
      </select>

      <select
        aria-label="정렬 순서"
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
        <option value="createdAt-desc">최신순</option>
        <option value="createdAt-asc">오래된순</option>
        <option value="updatedAt-desc">최근 수정순</option>
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
          초기화
          <span
            className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums"
            aria-label={`활성 필터 ${activeFilterCount}개`}
          >
            {activeFilterCount}
          </span>
        </Button>
      )}
    </div>
  );
}
