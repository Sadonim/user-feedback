import Link from 'next/link';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketTypeBadge } from './TicketTypeBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import type { TicketListItem } from '@/types';

function AssigneeCell({ username }: { username?: string | null }) {
  if (!username) return <span className="text-xs italic text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span
        aria-hidden="true"
        className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
      >
        {username.charAt(0).toUpperCase()}
      </span>
      {username}
    </span>
  );
}

interface TicketTableRowProps {
  ticket: TicketListItem;
}

function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function TicketTableRow({ ticket }: TicketTableRowProps) {
  const titleTruncated =
    ticket.title.length > 60
      ? `${ticket.title.slice(0, 57)}...`
      : ticket.title;

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <code className="text-xs font-mono text-muted-foreground">
          {ticket.trackingId}
        </code>
      </td>
      <td className="px-4 py-3">
        <TicketTypeBadge type={ticket.type} />
      </td>
      <td className="px-4 py-3">
        <TicketPriorityBadge priority={ticket.priority} aria-hidden />
      </td>
      <td className="px-4 py-3">
        <AssigneeCell username={ticket.assigneeUsername} />
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/admin/tickets/${ticket.id}`}
          className="font-medium hover:underline"
        >
          {titleTruncated}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {ticket.nickname ?? 'Anonymous'}
      </td>
      <td className="px-4 py-3">
        <TicketStatusBadge status={ticket.status} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatRelativeDate(ticket.createdAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/tickets/${ticket.id}`}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
