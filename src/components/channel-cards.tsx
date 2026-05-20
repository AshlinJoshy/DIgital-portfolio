import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ChannelIcon } from '@/components/channel-icon';
import { Badge } from '@/components/ui/badge';
import { Sparkline } from '@/components/charts/sparkline';
import { cn, formatNumber, formatPercent, formatUSD } from '@/lib/utils';
import { CHANNEL_COLORS, CHANNEL_LABELS, type Channel, type ChannelMetrics } from '@/lib/types';

interface Props {
  metrics: ChannelMetrics[];
  spendByChannelByDate: Record<Channel, { date: string; value: number }[]>;
}

export function ChannelCards({ metrics, spendByChannelByDate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((m) => (
        <ChannelCard key={m.channel} m={m} trend={spendByChannelByDate[m.channel]} />
      ))}
    </div>
  );
}

function ChannelCard({ m, trend }: { m: ChannelMetrics; trend: { value: number }[] }) {
  const isPaid = m.spend_usd > 0;
  return (
    <Card className="relative overflow-hidden hover:border-accent/40 transition-colors reveal">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <ChannelIcon channel={m.channel} size={28} />
            <div>
              <div className="font-display text-base font-medium leading-tight">
                {CHANNEL_LABELS[m.channel]}
              </div>
              <div className="text-[11px] text-muted-foreground tabular">
                {isPaid
                  ? `${formatUSD(m.spend_usd)} · ${formatPercent(m.share_of_spend, 1)} of paid`
                  : 'No paid spend'}
              </div>
            </div>
          </div>
          {!isPaid && (
            <Badge variant="outline">{m.channel === 'referral' ? 'partner-sourced' : 'unpaid'}</Badge>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
          <Stat label="CPC" value={isPaid ? formatUSD(m.cpc, { precise: true }) : '—'} />
          <Stat label="CPQA" value={isPaid && m.cpqa > 0 ? formatUSD(m.cpqa) : '—'} />
          <Stat
            label="CPA"
            value={isPaid && m.cpa > 0 ? formatUSD(m.cpa) : '—'}
            highlight={isPaid && m.cpa > 0 && m.cpa < 1000}
          />
          <Stat label="Sessions" value={formatNumber(m.sessions)} />
          <Stat label="QAs" value={formatNumber(m.qualified_actions)} />
          <Stat label="Conv." value={formatNumber(m.conversions)} highlight />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ROAS</div>
            <div
              className={cn(
                'font-display text-xl tabular',
                isPaid && m.roas >= 3 && 'text-emerald-500',
                isPaid && m.roas > 0 && m.roas < 1 && 'text-rose-500',
              )}
            >
              {isPaid && m.roas > 0 ? `${m.roas.toFixed(2)}×` : '—'}
            </div>
          </div>
          <div className="flex-1 max-w-[160px]">
            <Sparkline data={trend ?? []} color={CHANNEL_COLORS[m.channel]} height={32} />
          </div>
        </div>

        <Link
          href={`/journey?channel=${m.channel}`}
          className="mt-4 inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-accent"
        >
          Customer journeys for this channel <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 font-medium tabular', highlight ? 'text-foreground' : 'text-foreground/80')}>
        {value}
      </div>
    </div>
  );
}
