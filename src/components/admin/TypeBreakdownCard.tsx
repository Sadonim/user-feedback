import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeedbackType } from '@/types';

interface TypeBreakdownCardProps {
  byType: Record<FeedbackType, number>;
}

const typeConfig: Record<FeedbackType, { label: string; barClass: string; dotClass: string }> = {
  BUG: {
    label: '버그 신고',
    barClass: 'bg-red-500 dark:bg-red-400',
    dotClass: 'bg-red-500 dark:bg-red-400',
  },
  FEATURE: {
    label: '기능 요청',
    barClass: 'bg-purple-500 dark:bg-purple-400',
    dotClass: 'bg-purple-500 dark:bg-purple-400',
  },
  GENERAL: {
    label: '일반 문의',
    barClass: 'bg-teal-500 dark:bg-teal-400',
    dotClass: 'bg-teal-500 dark:bg-teal-400',
  },
};

export function TypeBreakdownCard({ byType }: TypeBreakdownCardProps) {
  const total = Object.values(byType).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>유형별 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(Object.entries(byType) as [FeedbackType, number][]).map(
          ([type, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const { label, barClass, dotClass } = typeConfig[type];
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-full ${dotClass}`}
                    />
                    <span className="text-sm">{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-sm font-semibold">{count}</span>
                    <span className="tabular-nums text-xs text-muted-foreground w-8 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${barClass}`}
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-label={`${label}: ${count} of ${total}`}
                  />
                </div>
              </div>
            );
          }
        )}
        {total === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">아직 데이터가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}
