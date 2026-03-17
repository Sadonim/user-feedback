import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
        {/* RST-01: h2 for proper heading hierarchy under Dashboard h1 */}
        <h2 data-slot="card-title" className="text-base leading-snug font-medium">
          Recent Tickets
        </h2>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              /* RST-02: clean aria-label so SR reads just the title, not badge noise */
              <Link
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                aria-label={`View ticket: ${ticket.title}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                {/* RST-02: badges are visual sugar; aria-label on Link covers intent */}
                <TicketTypeBadge type={ticket.type} aria-hidden />
                <span className="flex-1 truncate text-sm">{ticket.title}</span>
                <TicketStatusBadge status={ticket.status} aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
