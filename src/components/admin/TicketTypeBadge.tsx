import { cn } from '@/lib/utils';
import type { FeedbackType } from '@/types';

interface TicketTypeBadgeProps {
  type: FeedbackType;
}

const typeConfig: Record<FeedbackType, { label: string; className: string }> =
  {
    BUG: {
      label: 'Bug',
      className:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    FEATURE: {
      label: 'Feature',
      className:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    },
    GENERAL: {
      label: 'General',
      className:
        'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    },
  };

export function TicketTypeBadge({ type }: TicketTypeBadgeProps) {
  const { label, className } = typeConfig[type];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className
      )}
    >
      {label}
    </span>
  );
}
