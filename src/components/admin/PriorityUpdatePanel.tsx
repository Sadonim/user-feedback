'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { FeedbackDetail, Priority } from '@/types';

interface PriorityUpdatePanelProps {
  ticket: FeedbackDetail;
  onUpdate: (updated: FeedbackDetail) => void;
}

const PRIORITY_OPTIONS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export function PriorityUpdatePanel({ ticket, onUpdate }: PriorityUpdatePanelProps) {
  const [priority, setPriority] = useState<Priority | ''>(ticket.priority ?? '');
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if ((priority || null) === (ticket.priority ?? null)) {
      toast.info('이미 해당 우선순위로 설정되어 있습니다');
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/v1/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: priority || undefined }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? '우선순위 업데이트에 실패했습니다');
        return;
      }

      onUpdate(json.data);
      toast.success('우선순위가 업데이트되었습니다');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      {/* DTL-04: id on heading so select can reference it via aria-labelledby */}
      <h3 id="priority-heading" className="text-sm font-medium">우선순위</h3>

      {/* DTL-04: aria-labelledby links the select to the "Priority" heading */}
      <select
        aria-labelledby="priority-heading"
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority | '')}
        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
        disabled={isPending}
      >
        <option value="">없음</option>
        {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <Button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full"
        variant="outline"
      >
        {isPending ? '저장 중...' : '우선순위 설정'}
      </Button>
    </div>
  );
}
