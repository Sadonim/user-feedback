'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface DangerZoneCardProps {
  ticketId: string;
}

export function DangerZoneCard({ ticketId }: DangerZoneCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm('Delete this ticket? This action cannot be undone.')) return;

    startTransition(async () => {
      const res = await fetch(`/api/v1/tickets/${ticketId}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to delete ticket');
        return;
      }

      toast.success('Ticket deleted');
      router.push('/admin/tickets');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-destructive/30 p-4">
      <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
      {/* DTL-06: id allows delete button to reference this warning text */}
      <p id="danger-desc" className="text-xs text-muted-foreground">
        Permanently delete this ticket and all its history.
      </p>
      {/* DTL-06: aria-describedby associates button with the warning text */}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
        aria-describedby="danger-desc"
        className="w-full"
      >
        {/* DTL-05: Trash2 is decorative — button text already names the action */}
        <Trash2 aria-hidden="true" className="size-4" />
        {isPending ? 'Deleting...' : 'Delete Ticket'}
      </Button>
    </div>
  );
}
