import { Inbox } from 'lucide-react';
import { TicketTableRow } from './TicketTableRow';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import type { TicketListItem } from '@/types';

interface TicketTableProps {
  tickets: TicketListItem[];
  isLoading?: boolean;
}

export function TicketTable({ tickets, isLoading = false }: TicketTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border">
      {/* TBL-04: aria-busy communicates loading state to screen readers */}
      <table className="w-full text-sm" aria-busy={isLoading}>
        {/* TBL-01: caption gives the table an accessible name */}
        <caption className="sr-only">티켓 목록</caption>
        <thead className="border-b bg-muted/50">
          <tr>
            {/* TBL-02: scope="col" associates headers with their columns */}
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">유형</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">우선순위</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">담당자</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">제목</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">제출자</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">접수일</th>
            {/* TBL-03: empty header gets sr-only label so SR doesn't announce "blank" */}
            <th scope="col" className="px-4 py-3 text-right font-medium text-muted-foreground">
              <span className="sr-only">액션</span>
            </th>
          </tr>
        </thead>
        <tbody className={isLoading ? 'opacity-60 transition-opacity duration-200' : 'transition-opacity duration-200'}>
          {isLoading ? (
            <SkeletonTableRows rows={5} cols={9} />
          ) : tickets.length === 0 ? (
            <tr>
              <td colSpan={9}>
                <EmptyState
                  icon={Inbox}
                  title="티켓이 없습니다"
                  description="필터를 조정해보거나, 새 피드백이 들어올 때까지 기다려주세요."
                />
              </td>
            </tr>
          ) : (
            tickets.map((ticket) => (
              <TicketTableRow key={ticket.id} ticket={ticket} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
