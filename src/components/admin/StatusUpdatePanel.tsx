'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TicketStatusBadge } from './TicketStatusBadge';
import type { FeedbackDetail, TicketStatus } from '@/types';

interface StatusUpdatePanelProps {
  ticket: FeedbackDetail;
  onUpdate: (updated: FeedbackDetail) => void;
}

const STATUS_OPTIONS: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function StatusUpdatePanel({ ticket, onUpdate }: StatusUpdatePanelProps) {
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(ticket.status);
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (selectedStatus === ticket.status) {
      toast.info('이미 해당 상태로 설정되어 있습니다');
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/v1/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus, note: note || undefined }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? '상태 업데이트에 실패했습니다');
        return;
      }

      onUpdate(json.data);
      setNote('');
      toast.success('상태가 업데이트되었습니다');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        {/* DTL-02: id on heading so select can reference it via aria-labelledby */}
        <h3 id="status-heading" className="text-sm font-medium">상태</h3>
        <TicketStatusBadge status={ticket.status} />
      </div>

      {/* DTL-02: aria-labelledby links the select to the "Status" heading */}
      <select
        aria-labelledby="status-heading"
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
        disabled={isPending}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>

      {/* DTL-03: explicit label for the note textarea */}
      <label htmlFor="status-note" className="sr-only">
        상태 변경 메모
      </label>
      <textarea
        id="status-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="메모 추가 (선택)"
        maxLength={500}
        rows={2}
        disabled={isPending}
        className="w-full resize-none rounded-lg border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground"
      />

      <Button
        onClick={handleSubmit}
        disabled={isPending || selectedStatus === ticket.status}
        className="w-full"
      >
        {isPending ? '업데이트 중...' : '상태 업데이트'}
      </Button>
    </div>
  );
}
