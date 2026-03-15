'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TicketFiltersBar } from './TicketFiltersBar';
import { TicketTable } from './TicketTable';
import { TicketPagination } from './TicketPagination';
import type { TicketListItem, ApiMeta } from '@/types';
import type { TicketFiltersInput } from '@/lib/validators/feedback';

interface TicketListPageContentProps {
  initialFilters: TicketFiltersInput;
  initialData: TicketListItem[];
  initialMeta: ApiMeta;
}

export function TicketListPageContent({
  initialFilters,
  initialData,
  initialMeta,
}: TicketListPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);

  const updateFilters = useCallback(
    (newFilters: Partial<TicketFiltersInput>) => {
      const merged = { ...filters, ...newFilters, page: 1 };
      setFilters(merged);

      const params = new URLSearchParams(searchParams.toString());
      Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined) {
          params.set(k, String(v));
        } else {
          params.delete(k);
        }
      });

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [filters, pathname, router, searchParams]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <span className="text-sm text-muted-foreground">{initialMeta.total} tickets</span>
      </div>

      <TicketFiltersBar filters={filters} onChange={updateFilters} />

      <TicketTable tickets={initialData} isLoading={isPending} />

      <TicketPagination
        meta={initialMeta}
        currentPage={filters.page ?? 1}
        onPageChange={(page) => updateFilters({ page })}
      />
    </div>
  );
}
