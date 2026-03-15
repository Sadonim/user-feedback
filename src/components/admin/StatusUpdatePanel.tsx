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
      toast.info('Status is already set to this value');
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
        toast.error(json.error ?? 'Failed to update status');
        return;
      }

      onUpdate(json.data);
      setNote('');
      toast.success('Status updated');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Status</h3>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <select
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

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
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
        {isPending ? 'Updating...' : 'Update Status'}
      </Button>
    </div>
  );
}
