'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays } from 'lucide-react';

export type RangeKey = '30d' | '90d' | '180d' | '365d' | '720d' | 'all';

interface Ctx {
  range: RangeKey;
  setRange: (r: RangeKey) => void;
}

const DateRangeCtx = React.createContext<Ctx>({ range: 'all', setRange: () => {} });

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = React.useState<RangeKey>('all');
  return <DateRangeCtx.Provider value={{ range, setRange }}>{children}</DateRangeCtx.Provider>;
}

export function useDateRange() {
  return React.useContext(DateRangeCtx);
}

const LABELS: Record<RangeKey, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '180d': 'Last 6 months',
  '365d': 'Last 12 months',
  '720d': 'Last 24 months',
  all: 'All time (2y)',
};

export function DateRangePicker() {
  const { range, setRange } = useDateRange();
  return (
    <div className="inline-flex items-center gap-2">
      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LABELS) as RangeKey[]).map((k) => (
            <SelectItem key={k} value={k}>
              {LABELS[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function filterByRange<T extends { date?: string }>(rows: T[], range: RangeKey, endDate: string): T[] {
  if (range === 'all') return rows;
  const daysMap: Record<RangeKey, number> = {
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '365d': 365,
    '720d': 720,
    all: 9999,
  };
  const days = daysMap[range];
  const end = new Date(endDate);
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return rows.filter((r) => {
    if (!r.date) return true;
    const d = new Date(r.date);
    return d >= start && d <= end;
  });
}
