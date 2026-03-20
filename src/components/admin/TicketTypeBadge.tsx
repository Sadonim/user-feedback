import { cn } from '@/lib/utils';
import type { FeedbackType } from '@/types';

interface TicketTypeBadgeProps {
  type: FeedbackType;
  /** Pass true when the badge is inside a link that already has a descriptive aria-label */
  'aria-hidden'?: boolean;
}

const typeConfig: Record<FeedbackType, { label: string; className: string }> =
  {
    BUG: {
      label: '버그',
      className:
        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    },
    FEATURE: {
      label: '기능 요청',
      className:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    },
    GENERAL: {
      label: '일반',
      className:
        'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    },
  };

export function TicketTypeBadge({ type, 'aria-hidden': ariaHidden }: TicketTypeBadgeProps) {
  const { label, className } = typeConfig[type];
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
