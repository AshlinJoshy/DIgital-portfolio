'use client';

import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ChannelIcon } from '@/components/channel-icon';
import { Sparkline } from '@/components/charts/sparkline';
import { Badge } from '@/components/ui/badge';
import { cn, formatNumber, formatPercent, formatUSD, safe } from '@/lib/utils';
import { CHANNEL_LABELS, type Channel, type ChannelMetrics, type DailyTimeseries } from '@/lib/types';

interface Props {
  metrics: ChannelMetrics[];
  daily: DailyTimeseries[];
  spendByChannelByDate: Record<Channel, { date: string; value: number }[]>;
}

type SortKey =
  | 'spend_usd'
  | 'sessions'
  | 'qualified_actions'
  | 'conversions'
  | 'cpa'
  | 'roas'
  | 'conversion_rate'
  | 'share_of_spend';

const COLUMNS: { key: SortKey | 'channel' | 'trend'; label: string; align?: 'left' | 'right' }[] = [
  { key: 'channel', label: 'Channel', align: 'left' },
  { key: 'spend_usd', label: 'Spend', align: 'right' },
  { key: 'share_of_spend', label: 'Share', align: 'right' },
  { key: 'sessions', label: 'Sessions', align: 'right' },
  { key: 'qualified_actions', label: 'QAs', align: 'right' },
  { key: 'conversions', label: 'Conv.', align: 'right' },
  { key: 'cpa', label: 'CPA', align: 'right' },
  { key: 'roas', label: 'ROAS', align: 'right' },
  { key: 'conversion_rate', label: 'CVR', align: 'right' },
  { key: 'trend', label: 'Trend', align: 'right' },
];

export function ChannelSummaryTable({ metrics, spendByChannelByDate }: Props) {
  const [sortKey, setSortKey] = React.useState<SortKey>('spend_usd');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const sorted = React.useMemo(() => {
    const arr = [...metrics];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = av === bv ? 0 : av > bv ? 1 : -1;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [metrics, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-border/60 text-[10.5px] uppercase tracking-wider text-muted-foreground">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'py-2 px-2 font-medium',
                  col.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {col.key === 'channel' || col.key === 'trend' ? (
                  <span>{col.label}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key as SortKey)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => {
            const trend = (spendByChannelByDate[m.channel] ?? []).map((p) => ({ value: p.value }));
            const isPaid = m.spend_usd > 0;
            return (
              <tr
                key={m.channel}
                className="border-b border-border/40 hover:bg-secondary/40 transition-colors"
              >
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2.5">
                    <ChannelIcon channel={m.channel} size={20} />
                    <div>
                      <div className="font-medium text-foreground">
                        {CHANNEL_LABELS[m.channel]}
                      </div>
                      {!isPaid && (
                        <Badge variant="outline" className="mt-0.5 text-[9px]">
                          {m.channel === 'referral' ? 'partner-sourced' : 'unpaid'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-right tabular">
                  {isPaid ? formatUSD(m.spend_usd) : '—'}
                </td>
                <td className="py-2.5 px-2 text-right tabular text-muted-foreground">
                  {isPaid ? formatPercent(m.share_of_spend, 1) : '—'}
                </td>
                <td className="py-2.5 px-2 text-right tabular">{formatNumber(m.sessions)}</td>
                <td className="py-2.5 px-2 text-right tabular">{formatNumber(m.qualified_actions)}</td>
                <td className="py-2.5 px-2 text-right tabular font-medium">
                  {formatNumber(m.conversions)}
                </td>
                <td className="py-2.5 px-2 text-right tabular">
                  {isPaid && m.cpa > 0 ? formatUSD(m.cpa) : '—'}
                </td>
                <td className="py-2.5 px-2 text-right tabular">
                  {isPaid && m.roas > 0 ? (
                    <span
                      className={cn(
                        m.roas >= 3 && 'text-emerald-500',
                        m.roas < 1 && 'text-rose-500',
                      )}
                    >
                      {safe(m.roas).toFixed(2)}×
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-2.5 px-2 text-right tabular text-muted-foreground">
                  {formatPercent(m.conversion_rate, 2)}
                </td>
                <td className="py-2.5 px-2 w-[110px]">
                  <div className="w-full">
                    <Sparkline data={trend.length ? trend : [{ value: 0 }, { value: 0 }]} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
