'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays } from 'lucide-react';

export type RangeKey = '7d' | '30d' | '90d' | '180d' | 'all';

interface Ctx {
  range: RangeKey;
  setRange: (r: RangeKey) => void;
}

const DateRangeCtx = React.createContext<Ctx>({ range: '180d', setRange: () => {} });

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = React.useState<RangeKey>('180d');
  return <DateRangeCtx.Provider value={{ range, setRange }}>{children}</DateRangeCtx.Provider>;
}

export function useDateRange() {
  return React.useContext(DateRangeCtx);
}

const LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '180d': 'Last 180 days',
  all: 'All time',
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
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 180;
  const end = new Date(endDate);
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return rows.filter((r) => {
    if (!r.date) return true;
    const d = new Date(r.date);
    return d >= start && d <= end;
  });
}
