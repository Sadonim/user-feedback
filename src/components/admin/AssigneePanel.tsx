'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AssigneeBadge } from './AssigneeBadge';
import type { FeedbackDetail, AssigneeInfo } from '@/types';

interface AssigneePanelProps {
  ticket: FeedbackDetail;
  onUpdate: (updated: FeedbackDetail) => void;
}

export function AssigneePanel({ ticket, onUpdate }: AssigneePanelProps) {
  const [admins, setAdmins] = useState<AssigneeInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>(ticket.assigneeId ?? '');
  const [isPending, startTransition] = useTransition();

  // Fetch admin user list once on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchAdmins() {
      try {
        const res = await fetch('/api/v1/admin/users');
        if (!res.ok) throw new Error('Failed to load admins');
        const json = await res.json();
        if (!cancelled && json.success) {
          setAdmins(json.data as AssigneeInfo[]);
        }
      } catch {
        // Non-critical: dropdown will be empty but panel remains functional
        if (!cancelled) toast.error('Could not load admin users');
      }
    }

    void fetchAdmins();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentAssigneeId = ticket.assigneeId ?? null;
  const isDirty = (selectedId || null) !== currentAssigneeId;

  function handleAssign() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/tickets/${ticket.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigneeId: selectedId || null }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          toast.error(json.error ?? 'Failed to update assignee');
          return;
        }

        onUpdate(json.data as FeedbackDetail);
        toast.success(
          selectedId ? 'Ticket assigned' : 'Ticket unassigned'
        );
      } catch {
        toast.error('Network error — please try again');
      }
    });
  }

  const currentAssignee = ticket.assignee ?? null;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <h3 id="assignee-heading" className="text-sm font-medium">
        Assignee
      </h3>

      <div className="text-sm">
        <AssigneeBadge assignee={currentAssignee} size="sm" />
      </div>

      {/* Dropdown to pick a new assignee */}
      <select
        aria-labelledby="assignee-heading"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        disabled={isPending}
        className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {admins.map((admin) => (
          <option key={admin.id} value={admin.id}>
            {admin.username}
          </option>
        ))}
      </select>

      <Button
        onClick={handleAssign}
        disabled={isPending || !isDirty}
        className="w-full"
        variant="outline"
      >
        {isPending ? 'Saving…' : 'Assign'}
      </Button>
    </div>
  );
}
