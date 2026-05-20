'use client';

import * as React from 'react';
import { cn, formatNumber, formatPercent } from '@/lib/utils';

interface Stage {
  label: string;
  value: number;
  description: string;
}

interface Props {
  stages: Stage[];
  className?: string;
  highlightStage?: number;
  variant?: 'default' | 'compact';
}

export function FunnelChart({ stages, className, highlightStage, variant = 'default' }: Props) {
  const max = stages[0]?.value ?? 0;
  const compact = variant === 'compact';
  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {stages.map((s, i) => {
        const widthPct = max > 0 ? (s.value / max) * 100 : 0;
        const prev = i > 0 ? stages[i - 1].value : null;
        const dropoff = prev !== null && prev > 0 ? (prev - s.value) / prev : 0;
        const highlight = highlightStage === i;
        return (
          <div key={s.label} className="reveal" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className={cn('font-medium text-foreground', compact && 'text-[10.5px]')}>
                {s.label}
              </span>
              <span className="tabular text-muted-foreground">
                <span className="text-foreground">{formatNumber(s.value)}</span>
                {prev !== null && (
                  <span className="ml-2">
                    · drop {formatPercent(dropoff, 0)}
                  </span>
                )}
              </span>
            </div>
            <div
              className={cn(
                'h-7 rounded-sm bg-muted overflow-hidden relative',
                compact && 'h-5',
              )}
            >
              <div
                className={cn(
                  'absolute inset-y-0 left-0 transition-all',
                  highlight ? 'bg-accent' : 'bg-foreground/70',
                )}
                style={{ width: `${widthPct}%` }}
              />
              <div className="absolute inset-0 flex items-center px-2 text-[10px] text-background font-medium">
                {widthPct > 25 ? s.description : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
