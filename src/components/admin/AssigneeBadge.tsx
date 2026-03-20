import { cn } from '@/lib/utils';
import type { AssigneeInfo } from '@/types';

interface AssigneeBadgeProps {
  assignee: AssigneeInfo | null | undefined;
  size?: 'sm' | 'md';
}

function getInitial(username: string): string {
  return username.charAt(0).toUpperCase();
}

export function AssigneeBadge({ assignee, size = 'md' }: AssigneeBadgeProps) {
  if (!assignee) {
    return (
      <span className="text-muted-foreground text-xs italic">미배정</span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}
    >
      {/* Avatar initial */}
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-primary font-medium text-primary-foreground',
          size === 'sm' ? 'size-5 text-[10px]' : 'size-6 text-xs'
        )}
      >
        {getInitial(assignee.username)}
      </span>
      <span className="text-foreground">{assignee.username}</span>
    </span>
  );
}
