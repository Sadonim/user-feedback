import { cn } from '@/lib/utils';
import type { Priority } from '@/types';

// PriorityColor is scoped locally — not exported to types/index.ts per design spec
type PriorityColor = 'destructive' | 'orange' | 'yellow' | 'muted';

interface TicketPriorityBadgeProps {
  priority: Priority | null;
  /** Pass true when the badge is inside a link that already has an aria-label */
  'aria-hidden'?: boolean;
}

const priorityConfig: Record<Priority, { label: string; color: PriorityColor; className: string }> =
  {
    CRITICAL: {
      label: 'Critical',
      color: 'destructive',
      className:
        'text-destructive bg-destructive/10 border border-destructive/30',
    },
    HIGH: {
      label: 'High',
      color: 'orange',
      className:
        'text-orange-700 bg-orange-100 border border-orange-200 dark:text-orange-300 dark:bg-orange-900/30 dark:border-orange-800',
    },
    MEDIUM: {
      label: 'Medium',
      color: 'yellow',
      className:
        'text-yellow-700 bg-yellow-100 border border-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-800',
    },
    LOW: {
      label: 'Low',
      color: 'muted',
      className:
        'text-muted-foreground bg-muted border border-border',
    },
  };

export function TicketPriorityBadge({
  priority,
  'aria-hidden': ariaHidden,
}: TicketPriorityBadgeProps) {
  if (priority === null || priority === undefined) return null;

  const { label, className } = priorityConfig[priority];

  return (
    <span
      aria-hidden={ariaHidden}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      {label}
    </span>
  );
}
