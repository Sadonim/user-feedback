import { TicketStatusBadge } from './TicketStatusBadge';
import type { StatusHistoryEntry } from '@/types';

interface StatusHistoryTimelineItemProps {
  entry: StatusHistoryEntry;
  isFirst: boolean;
  isLast: boolean;
}

export function StatusHistoryTimelineItem({
  entry,
  isLast,
}: StatusHistoryTimelineItemProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="size-2 rounded-full bg-border mt-2" />
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>
      <div className="pb-3 pt-1 min-h-[2rem]">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {entry.fromStatus ? (
            <>
              <TicketStatusBadge status={entry.fromStatus} />
              <span className="text-muted-foreground">→</span>
              <TicketStatusBadge status={entry.toStatus} />
            </>
          ) : (
            <>
              <span className="text-muted-foreground">접수 상태:</span>
              <TicketStatusBadge status={entry.toStatus} />
            </>
          )}
          <span className="text-xs text-muted-foreground ml-1">
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        </div>
        {entry.note && (
          <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
        )}
      </div>
    </div>
  );
}
