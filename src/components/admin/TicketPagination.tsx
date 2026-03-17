import { Button } from '@/components/ui/button';
import type { ApiMeta } from '@/types';

interface TicketPaginationProps {
  meta: ApiMeta;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function TicketPagination({
  meta,
  currentPage,
  onPageChange,
}: TicketPaginationProps) {
  if (meta.total <= meta.limit) return null;

  const totalPages = Math.ceil(meta.total / meta.limit);
  const isFirst = currentPage <= 1;
  const isLast = !meta.hasNextPage;

  return (
    /* PAG-01: nav landmark makes pagination discoverable by AT */
    <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
      <p className="text-muted-foreground">
        Showing {(currentPage - 1) * meta.limit + 1}–
        {Math.min(currentPage * meta.limit, meta.total)} of {meta.total}
      </p>
      <div className="flex gap-2">
        {/* PAG-02, PAG-03: descriptive labels; aria-disabled (not disabled attr)
            keeps element in tab order so AT can still announce the state */}
        <Button
          variant="outline"
          size="sm"
          aria-label="Go to previous page"
          aria-disabled={isFirst}
          onClick={() => { if (!isFirst) onPageChange(currentPage - 1); }}
          className={isFirst ? 'pointer-events-none opacity-50' : ''}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Go to next page"
          aria-disabled={isLast}
          onClick={() => { if (!isLast) onPageChange(currentPage + 1); }}
          className={isLast ? 'pointer-events-none opacity-50' : ''}
        >
          Next
        </Button>
      </div>
      <p className="text-muted-foreground">
        {/* PAG-02: current page context for SR */}
        <span aria-current="page" aria-label={`Page ${currentPage} of ${totalPages}, current page`}>
          Page {currentPage} of {totalPages}
        </span>
      </p>
    </nav>
  );
}
