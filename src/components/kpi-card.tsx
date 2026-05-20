import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkline } from '@/components/charts/sparkline';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  trend?: { change: number; direction: 'up' | 'down' | 'flat' };
  sparkline?: { value: number }[];
  accent?: boolean;
  className?: string;
  sublabel?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  sparkline,
  accent,
  className,
  sublabel,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden reveal',
        accent && 'border-accent/30 gradient-card',
        className,
      )}
    >
      {accent && (
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
      )}
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <div className="text-2xl sm:text-[26px] font-display font-medium tabular leading-none text-foreground">
                {value}
              </div>
              {sublabel && (
                <div className="text-[11px] text-muted-foreground tabular">{sublabel}</div>
              )}
            </div>
            {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
          </div>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular',
                trend.direction === 'up' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                trend.direction === 'down' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                trend.direction === 'flat' && 'bg-muted text-muted-foreground',
              )}
            >
              {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend.direction === 'flat' && <Minus className="h-3 w-3" />}
              {Math.abs(trend.change).toFixed(1)}%
            </div>
          )}
        </div>
        {sparkline && (
          <div className="mt-3 -mx-1">
            <Sparkline data={sparkline} color={accent ? 'hsl(var(--accent))' : 'hsl(var(--foreground) / 0.5)'} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
