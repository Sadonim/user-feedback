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

  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-muted-foreground">
        Showing {(currentPage - 1) * meta.limit + 1}–
        {Math.min(currentPage * meta.limit, meta.total)} of {meta.total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
      <p className="text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
    </div>
  );
}
