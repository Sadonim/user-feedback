import { TicketTableRow } from './TicketTableRow';
import type { TicketListItem } from '@/types';

interface TicketTableProps {
  tickets: TicketListItem[];
  isLoading?: boolean;
}

export function TicketTable({ tickets, isLoading = false }: TicketTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitter</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground" />
          </tr>
        </thead>
        <tbody
          className={isLoading ? 'opacity-50 transition-opacity' : ''}
        >
          {tickets.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-muted-foreground"
              >
                No tickets found.
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
