import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RecentActivityCardProps {
  today: number;
  thisWeek: number;
}

export function RecentActivityCard({ today, thisWeek }: RecentActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 접수 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">오늘</span>
          <span className="tabular-nums text-xl font-bold">{today}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">이번 주</span>
          <span className="tabular-nums text-xl font-bold">{thisWeek}</span>
        </div>
      </CardContent>
    </Card>
  );
}
