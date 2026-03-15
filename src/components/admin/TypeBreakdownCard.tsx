import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FeedbackType } from '@/types';

interface TypeBreakdownCardProps {
  byType: Record<FeedbackType, number>;
}

const typeLabels: Record<FeedbackType, string> = {
  BUG: 'Bug Reports',
  FEATURE: 'Feature Requests',
  GENERAL: 'General Inquiries',
};

export function TypeBreakdownCard({ byType }: TypeBreakdownCardProps) {
  const total = Object.values(byType).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>By Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.entries(byType) as [FeedbackType, number][]).map(
          ([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm">{typeLabels[type]}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-6 text-right text-sm font-medium">{count}</span>
              </div>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
