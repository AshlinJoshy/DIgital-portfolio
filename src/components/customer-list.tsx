'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChannelIcon } from '@/components/channel-icon';
import { cn, formatRelativeTime, formatUSD } from '@/lib/utils';
import { CHANNELS, type Channel, type FunnelStage } from '@/lib/types';

export interface CustomerListItem {
  id: string;
  initials: string;
  full_name: string;
  email: string;
  first_touch_channel: Channel;
  current_stage: FunnelStage;
  predicted_conversion_probability: number;
  predicted_ltv_usd: number;
  created_at: string;
  converted: boolean;
}

interface Props {
  customers: CustomerListItem[];
}

const STAGE_LABELS: Record<FunnelStage, string> = {
  impression: 'Impression',
  session: 'Session',
  engaged_session: 'Engaged',
  qualified_action: 'Qualified',
  conversion: 'Converted',
  repeat_customer: 'Repeat',
};

export function CustomerList({ customers }: Props) {
  const [search, setSearch] = React.useState('');
  const [channel, setChannel] = React.useState<Channel | 'all'>('all');
  const [stage, setStage] = React.useState<FunnelStage | 'all'>('all');
  const [sortBy, setSortBy] = React.useState<'score' | 'recent' | 'ltv'>('score');

  const filtered = React.useMemo(() => {
    let arr = customers;
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (c) =>
          c.email.toLowerCase().includes(q) ||
          c.full_name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      );
    }
    if (channel !== 'all') arr = arr.filter((c) => c.first_touch_channel === channel);
    if (stage !== 'all') arr = arr.filter((c) => c.current_stage === stage);
    arr = [...arr].sort((a, b) => {
      if (sortBy === 'score') return b.predicted_conversion_probability - a.predicted_conversion_probability;
      if (sortBy === 'ltv') return b.predicted_ltv_usd - a.predicted_ltv_usd;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return arr;
  }, [customers, search, channel, stage, sortBy]);

  const PAGE = 50;
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(0), [search, channel, stage, sortBy]);
  const view = filtered.slice(0, (page + 1) * PAGE);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="pl-7 h-8 text-xs"
          />
        </div>
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={channel} onValueChange={(v) => setChannel(v as Channel | 'all')}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {CHANNELS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={(v) => setStage(v as FunnelStage | 'all')}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as never)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">By score</SelectItem>
            <SelectItem value="recent">By recency</SelectItem>
            <SelectItem value="ltv">By LTV</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-[11px] text-muted-foreground tabular">
          {filtered.length.toLocaleString()} customers
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-border/60 text-[10.5px] uppercase tracking-wider text-muted-foreground bg-secondary/30">
                <th className="py-2 px-3 text-left font-medium">Customer</th>
                <th className="py-2 px-3 text-left font-medium">First touch</th>
                <th className="py-2 px-3 text-left font-medium">Stage</th>
                <th className="py-2 px-3 text-right font-medium">Score</th>
                <th className="py-2 px-3 text-right font-medium">Pred. LTV</th>
                <th className="py-2 px-3 text-right font-medium">Last activity</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {view.map((c) => (
                <tr key={c.id} className="border-b border-border/30 hover:bg-secondary/40 transition-colors group">
                  <td className="py-2 px-3">
                    <Link href={`/customers/${c.id}`} className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-foreground">
                        {c.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{c.full_name}</div>
                        <div className="text-[10.5px] text-muted-foreground truncate max-w-[200px]">
                          {c.email}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-2 px-3">
                    <ChannelIcon channel={c.first_touch_channel} size={16} withLabel />
                  </td>
                  <td className="py-2 px-3">
                    <StageBadge stage={c.current_stage} />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <ScoreCell score={c.predicted_conversion_probability} converted={c.converted} />
                  </td>
                  <td className="py-2 px-3 text-right tabular">{formatUSD(c.predicted_ltv_usd)}</td>
                  <td className="py-2 px-3 text-right tabular text-muted-foreground text-[11px]">
                    {formatRelativeTime(c.created_at)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-muted-foreground group-hover:text-foreground inline-flex"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {view.length < filtered.length && (
          <div className="p-3 text-center border-t border-border/40">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="text-[12px] font-medium text-accent hover:underline"
            >
              Load {Math.min(PAGE, filtered.length - view.length)} more
            </button>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No customers match these filters. Try clearing them.
          </div>
        )}
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: FunnelStage }) {
  const variants: Record<FunnelStage, 'secondary' | 'default' | 'accent' | 'success'> = {
    impression: 'secondary',
    session: 'secondary',
    engaged_session: 'default',
    qualified_action: 'accent',
    conversion: 'success',
    repeat_customer: 'success',
  };
  return <Badge variant={variants[stage]}>{STAGE_LABELS[stage]}</Badge>;
}

function ScoreCell({ score, converted }: { score: number; converted: boolean }) {
  if (converted) {
    return <span className="text-emerald-500 font-medium tabular">CVT</span>;
  }
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full',
            score >= 0.5 ? 'bg-accent' : score >= 0.2 ? 'bg-foreground/60' : 'bg-foreground/30',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-medium tabular text-[11px] w-[28px]">{pct}%</span>
    </div>
  );
}
