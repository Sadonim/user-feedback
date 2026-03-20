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
    <nav aria-label="페이지 이동" className="flex items-center justify-between text-sm">
      <p className="tabular-nums text-muted-foreground">
        {(currentPage - 1) * meta.limit + 1}–
        {Math.min(currentPage * meta.limit, meta.total)} / 전체 {meta.total}건
      </p>
      <div className="flex gap-2">
        {/* PAG-02, PAG-03: descriptive labels; aria-disabled (not disabled attr)
            keeps element in tab order so AT can still announce the state */}
        <Button
          variant="outline"
          size="sm"
          aria-label="이전 페이지로 이동"
          aria-disabled={isFirst}
          onClick={() => { if (!isFirst) onPageChange(currentPage - 1); }}
          className={isFirst ? 'pointer-events-none opacity-50' : ''}
        >
          이전
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="다음 페이지로 이동"
          aria-disabled={isLast}
          onClick={() => { if (!isLast) onPageChange(currentPage + 1); }}
          className={isLast ? 'pointer-events-none opacity-50' : ''}
        >
          다음
        </Button>
      </div>
      <p className="tabular-nums text-muted-foreground">
        {/* PAG-02: current page context for SR */}
        <span aria-current="page" aria-label={`${totalPages}페이지 중 ${currentPage}페이지, 현재 페이지`}>
          {currentPage} / {totalPages} 페이지
        </span>
      </p>
    </nav>
  );
}
