import { cn } from '@/lib/utils';
import type { TicketStatus } from '@/types';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  /** Pass true when the badge is inside a link that already has a descriptive aria-label */
  'aria-hidden'?: boolean;
}

const statusConfig: Record<
  TicketStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: '접수됨',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  IN_PROGRESS: {
    label: '처리 중',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  RESOLVED: {
    label: '해결됨',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  CLOSED: {
    label: '종료됨',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

export function TicketStatusBadge({ status, 'aria-hidden': ariaHidden }: TicketStatusBadgeProps) {
  const { label, className } = statusConfig[status];
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
