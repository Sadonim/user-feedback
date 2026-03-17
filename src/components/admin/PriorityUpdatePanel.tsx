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
      toast.info('Priority is already set to this value');
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
        toast.error(json.error ?? 'Failed to update priority');
        return;
      }

      onUpdate(json.data);
      toast.success('Priority updated');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      {/* DTL-04: id on heading so select can reference it via aria-labelledby */}
      <h3 id="priority-heading" className="text-sm font-medium">Priority</h3>

      {/* DTL-04: aria-labelledby links the select to the "Priority" heading */}
      <select
        aria-labelledby="priority-heading"
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority | '')}
        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm"
        disabled={isPending}
      >
        <option value="">None</option>
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
        {isPending ? 'Saving...' : 'Set Priority'}
      </Button>
    </div>
  );
}
