import { Inbox } from 'lucide-react';
import { TicketTableRow } from './TicketTableRow';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import type { TicketListItem } from '@/types';

interface TicketTableProps {
  tickets: TicketListItem[];
  isLoading?: boolean;
}

export function TicketTable({ tickets, isLoading = false }: TicketTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border">
      {/* TBL-04: aria-busy communicates loading state to screen readers */}
      <table className="w-full text-sm" aria-busy={isLoading}>
        {/* TBL-01: caption gives the table an accessible name */}
        <caption className="sr-only">Ticket list</caption>
        <thead className="border-b bg-muted/50">
          <tr>
            {/* TBL-02: scope="col" associates headers with their columns */}
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Assignee</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Submitter</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
            {/* TBL-03: empty header gets sr-only label so SR doesn't announce "blank" */}
            <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className={isLoading ? 'opacity-60 transition-opacity duration-200' : 'transition-opacity duration-200'}>
          {isLoading ? (
            <SkeletonTableRows rows={5} cols={9} />
          ) : tickets.length === 0 ? (
            <tr>
              <td colSpan={9}>
                <EmptyState
                  icon={Inbox}
                  title="No tickets found"
                  description="Try adjusting your filters, or wait for new feedback to arrive."
                />
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <TicketTableRow key={ticket.id} ticket={ticket} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
