'use client';

import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ChannelIcon } from '@/components/channel-icon';
import { cn, formatNumber, formatPercent, formatUSD } from '@/lib/utils';
import type { Channel } from '@/lib/types';

export interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  channel: Channel;
  impressions: number;
  clicks: number;
  spend: number;
  platform_conversions: number;
}

interface Props {
  campaigns: CampaignRow[];
  selectedChannel?: Channel | 'all';
}

export function CampaignTable({ campaigns, selectedChannel = 'all' }: Props) {
  const [search, setSearch] = React.useState('');
  const [sortKey, setSortKey] = React.useState<keyof CampaignRow>('spend');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const filtered = campaigns
    .filter((c) => (selectedChannel === 'all' ? true : c.channel === selectedChannel))
    .filter((c) =>
      search ? c.campaign_name.toLowerCase().includes(search.toLowerCase()) : true,
    )
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === 'desc' ? -cmp : cmp;
    })
    .slice(0, 50);

  const toggleSort = (k: keyof CampaignRow) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(k);
      setSortDir('desc');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-7 h-8 text-xs"
          />
        </div>
        <div className="text-[11px] text-muted-foreground tabular">
          {filtered.length} of {campaigns.filter((c) => selectedChannel === 'all' || c.channel === selectedChannel).length} campaigns
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border/60 text-[10.5px] uppercase tracking-wider text-muted-foreground">
              {[
                { key: 'campaign_name', label: 'Campaign', align: 'left' },
                { key: 'impressions', label: 'Impr.', align: 'right' },
                { key: 'clicks', label: 'Clicks', align: 'right' },
                { key: 'spend', label: 'Spend', align: 'right' },
                { key: 'platform_conversions', label: 'Conv.', align: 'right' },
              ].map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'py-2 px-2 font-medium',
                    col.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  <button
                    onClick={() => toggleSort(col.key as keyof CampaignRow)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'desc' ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </button>
                </th>
              ))}
              <th className="py-2 px-2 text-right font-medium">CPC</th>
              <th className="py-2 px-2 text-right font-medium">CTR</th>
              <th className="py-2 px-2 text-right font-medium">CPA</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const cpc = c.clicks > 0 ? c.spend / c.clicks : 0;
              const ctr = c.impressions > 0 ? c.clicks / c.impressions : 0;
              const cpa = c.platform_conversions > 0 ? c.spend / c.platform_conversions : 0;
              return (
                <tr
                  key={c.campaign_id}
                  className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={c.channel} size={16} />
                      <span className="font-medium truncate max-w-[260px]">{c.campaign_name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right tabular text-muted-foreground">
                    {formatNumber(c.impressions, true)}
                  </td>
                  <td className="py-2 px-2 text-right tabular">{formatNumber(c.clicks)}</td>
                  <td className="py-2 px-2 text-right tabular font-medium">{formatUSD(c.spend)}</td>
                  <td className="py-2 px-2 text-right tabular">{formatNumber(c.platform_conversions)}</td>
                  <td className="py-2 px-2 text-right tabular text-muted-foreground">
                    {formatUSD(cpc, { precise: true })}
                  </td>
                  <td className="py-2 px-2 text-right tabular text-muted-foreground">
                    {formatPercent(ctr, 2)}
                  </td>
                  <td className="py-2 px-2 text-right tabular">
                    {cpa > 0 ? formatUSD(cpa) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
