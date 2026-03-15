import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketTypeBadge } from './TicketTypeBadge';
import type { TicketListItem } from '@/types';

interface RecentTicketsTableProps {
  tickets: TicketListItem[];
}

export function RecentTicketsTable({ tickets }: RecentTicketsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <TicketTypeBadge type={ticket.type} />
                <span className="flex-1 truncate text-sm">{ticket.title}</span>
                <TicketStatusBadge status={ticket.status} />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
