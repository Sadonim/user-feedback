import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
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
          최근 티켓
        </h2>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="아직 티켓이 없습니다"
            description="새로운 피드백이 제출되면 여기에 표시됩니다."
            className="py-8"
          />
        ) : (
          <div className="space-y-1">
            {tickets.map((ticket) => (
              /* RST-02: clean aria-label so SR reads just the title, not badge noise */
              <Link
                key={ticket.id}
                href={`/admin/tickets/${ticket.id}`}
                aria-label={`View ticket: ${ticket.title}`}
                className="flex items-center gap-3 rounded-lg p-2.5 transition-colors duration-100 hover:bg-muted group"
              >
                {/* RST-02: badges are visual sugar; aria-label on Link covers intent */}
                <TicketTypeBadge type={ticket.type} aria-hidden />
                <span className="flex-1 truncate text-sm group-hover:text-foreground transition-colors">
                  {ticket.title}
                </span>
                <TicketStatusBadge status={ticket.status} aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
