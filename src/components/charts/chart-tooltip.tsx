'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Payload {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
  dataKey?: string;
}

interface Props {
  active?: boolean;
  payload?: Payload[];
  label?: string | number;
  formatter?: (value: number | string, name?: string) => React.ReactNode;
  labelFormatter?: (label: string | number) => React.ReactNode;
  className?: string;
  hideLabel?: boolean;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  className,
  hideLabel,
}: Props) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'min-w-[160px] rounded-md border border-border/80 bg-popover/95 backdrop-blur px-3 py-2 shadow-lg text-[11.5px]',
        className,
      )}
    >
      {!hideLabel && label != null && (
        <div className="font-medium text-foreground mb-1.5 tabular">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: p.color }}
              />
              <span className="text-muted-foreground capitalize">{p.name?.replace(/_/g, ' ')}</span>
            </div>
            <span className="font-medium text-foreground tabular">
              {formatter && p.value != null ? formatter(p.value, p.name) : String(p.value ?? '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
