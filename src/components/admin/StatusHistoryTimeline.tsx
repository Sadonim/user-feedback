import { StatusHistoryTimelineItem } from './StatusHistoryTimelineItem';
import type { StatusHistoryEntry } from '@/types';

interface StatusHistoryTimelineProps {
  history: StatusHistoryEntry[];
}

export function StatusHistoryTimeline({ history }: StatusHistoryTimelineProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground">처리 이력</h3>
      <div className="space-y-0">
        {history.map((entry, i) => (
          <StatusHistoryTimelineItem
            key={entry.id}
            entry={entry}
            isFirst={i === 0}
            isLast={i === history.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
