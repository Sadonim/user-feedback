import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: 'default' | 'blue' | 'amber' | 'green' | 'red';
  subtitle?: string;
}

const colorMap: Record<NonNullable<StatsCardProps['color']>, string> = {
  default: 'text-foreground',
  blue: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  green: 'text-green-600 dark:text-green-400',
  red: 'text-red-600 dark:text-red-400',
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  subtitle,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn('size-4', colorMap[color])} />
        </div>
      </CardHeader>
      <CardContent>
        <p className={cn('text-3xl font-bold', colorMap[color])}>{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
