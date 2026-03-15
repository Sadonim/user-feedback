import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RecentActivityCardProps {
  today: number;
  thisWeek: number;
}

export function RecentActivityCard({ today, thisWeek }: RecentActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Today</span>
          <span className="text-xl font-bold">{today}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">This week</span>
          <span className="text-xl font-bold">{thisWeek}</span>
        </div>
      </CardContent>
    </Card>
  );
}
