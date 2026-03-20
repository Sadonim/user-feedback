import Link from 'next/link';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketTypeBadge } from './TicketTypeBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import type { TicketListItem } from '@/types';

function AssigneeCell({ username }: { username?: string | null }) {
  if (!username) return <span className="text-xs italic text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        aria-hidden="true"
        className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
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
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(date).toLocaleDateString('ko-KR');
}

export function TicketTableRow({ ticket }: TicketTableRowProps) {
  const titleTruncated =
    ticket.title.length > 60
      ? `${ticket.title.slice(0, 57)}...`
      : ticket.title;

  return (
    <tr className="group border-b last:border-b-0 transition-colors duration-100 hover:bg-muted/40">
      <td className="px-4 py-2.5">
        <code className="tabular-nums text-xs font-mono text-muted-foreground group-hover:text-foreground/70 transition-colors">
          {ticket.trackingId}
        </code>
      </td>
      <td className="px-4 py-2.5">
        <TicketTypeBadge type={ticket.type} />
      </td>
      <td className="px-4 py-2.5">
        <TicketPriorityBadge priority={ticket.priority} aria-hidden />
      </td>
      <td className="px-4 py-2.5">
        <AssigneeCell username={ticket.assigneeUsername} />
      </td>
      <td className="px-4 py-2.5 max-w-xs">
        <Link
          href={`/admin/tickets/${ticket.id}`}
          className="font-medium hover:underline decoration-muted-foreground underline-offset-2 transition-colors"
        >
          {titleTruncated}
        </Link>
      </td>
      <td className="px-4 py-2.5 text-sm text-muted-foreground">
        {ticket.nickname ?? '익명'}
      </td>
      <td className="px-4 py-2.5">
        <TicketStatusBadge status={ticket.status} />
      </td>
      <td className="px-4 py-2.5 tabular-nums text-sm text-muted-foreground whitespace-nowrap">
        {formatRelativeDate(ticket.createdAt)}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Link
          href={`/admin/tickets/${ticket.id}`}
          className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all duration-150"
          aria-label={`티켓 보기: ${ticket.title}`}
        >
          보기 →
        </Link>
      </td>
    </tr>
  );
}
