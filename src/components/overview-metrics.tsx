'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/kpi-card';
import { ChannelSummaryTable } from '@/components/channel-summary-table';
import { OverviewTimeseries } from '@/components/charts/overview-timeseries';
import { filterByRange, useDateRange } from '@/components/date-range-context';
import { formatNumber, formatPercent, formatUSD } from '@/lib/utils';
import {
  CHANNELS,
  type AttributionWeights,
  type BrandedSearchBreakdown,
  type Channel,
  type ChannelMetrics,
  type DailyChannelMetric,
  type DailyTimeseries,
} from '@/lib/types';

interface Props {
  dailyByChannel: DailyChannelMetric[];
  dailyOverall: DailyTimeseries[];
  channelImpressionsTotal: Record<Channel, number>;
  channelClicksTotal: Record<Channel, number>;
  pipelineValue: number;
  attribution: AttributionWeights;
  branded: BrandedSearchBreakdown;
  endDate: string;
}

export function OverviewMetrics({
  dailyByChannel,
  dailyOverall,
  channelImpressionsTotal,
  channelClicksTotal,
  pipelineValue,
  attribution,
  branded,
  endDate,
}: Props) {
  const { range } = useDateRange();

  const filteredByChannel = React.useMemo(
    () => filterByRange(dailyByChannel, range, endDate),
    [dailyByChannel, range, endDate],
  );

  const filteredOverall = React.useMemo(
    () => filterByRange(dailyOverall, range, endDate),
    [dailyOverall, range, endDate],
  );

  // KPI aggregation from filtered overall (paid + unpaid)
  const kpi = React.useMemo(() => {
    let spend = 0;
    let sessions = 0;
    let qa = 0;
    let conv = 0;
    let value = 0;
    let customers = 0;
    for (const r of filteredOverall) {
      spend += r.spend_usd;
      sessions += r.sessions;
      qa += r.qualified_actions;
      conv += r.conversions;
      value += r.conversion_value_usd;
      customers += r.customers_acquired;
    }
    return {
      spend,
      sessions,
      qualified_actions: qa,
      conversions: conv,
      conversion_value_usd: value,
      customers_acquired: customers,
      cpa: conv > 0 ? spend / conv : 0,
      blendedRoas: spend > 0 ? value / spend : 0,
      aov: conv > 0 ? value / conv : 0,
    };
  }, [filteredOverall]);

  // Per-channel rollup from the filtered slice
  const channelMetrics = React.useMemo<ChannelMetrics[]>(() => {
    const acc: Record<Channel, ChannelMetrics> = {} as Record<Channel, ChannelMetrics>;
    for (const c of CHANNELS) {
      acc[c] = {
        channel: c,
        spend_usd: 0,
        impressions: 0,
        clicks: 0,
        sessions: 0,
        qualified_actions: 0,
        conversions: 0,
        conversion_value_usd: 0,
        cpc: 0,
        cpl: 0,
        cpqa: 0,
        cpa: 0,
        ctr: 0,
        conversion_rate: 0,
        share_of_spend: 0,
        roas: 0,
      };
    }
    for (const r of filteredByChannel) {
      const m = acc[r.channel];
      m.spend_usd += r.spend_usd;
      m.clicks += r.clicks;
      m.impressions += r.impressions;
      m.sessions += r.sessions;
      m.qualified_actions += r.qualified_actions;
      m.conversions += r.conversions;
      m.conversion_value_usd += r.conversion_value_usd;
    }
    // Compute derived metrics
    const totalSpend = Object.values(acc).reduce((a, m) => a + m.spend_usd, 0);
    for (const c of CHANNELS) {
      const m = acc[c];
      m.cpc = m.clicks > 0 ? m.spend_usd / m.clicks : 0;
      m.cpl = m.qualified_actions > 0 ? m.spend_usd / m.qualified_actions : 0;
      m.cpqa = m.cpl;
      m.cpa = m.conversions > 0 ? m.spend_usd / m.conversions : 0;
      m.ctr = m.impressions > 0 ? m.clicks / m.impressions : 0;
      m.conversion_rate = m.sessions > 0 ? m.conversions / m.sessions : 0;
      m.share_of_spend = totalSpend > 0 ? m.spend_usd / totalSpend : 0;
      m.roas = m.spend_usd > 0 ? m.conversion_value_usd / m.spend_usd : 0;
    }
    return Object.values(acc).sort((a, b) => {
      if (a.spend_usd !== b.spend_usd) return b.spend_usd - a.spend_usd;
      return b.sessions - a.sessions;
    });
  }, [filteredByChannel]);

  // Per-channel daily spend for the sparklines in the table
  const spendByChannelByDate = React.useMemo(() => {
    const out: Record<Channel, { date: string; value: number }[]> = Object.fromEntries(
      CHANNELS.map((c) => [c, [] as { date: string; value: number }[]]),
    ) as Record<Channel, { date: string; value: number }[]>;
    const dateSet = new Set<string>();
    const byKey = new Map<string, number>();
    for (const r of filteredByChannel) {
      dateSet.add(r.date);
      byKey.set(`${r.date}|${r.channel}`, (byKey.get(`${r.date}|${r.channel}`) ?? 0) + r.spend_usd);
    }
    const dates = Array.from(dateSet).sort();
    for (const c of CHANNELS) {
      out[c] = dates.map((d) => ({ date: d, value: byKey.get(`${d}|${c}`) ?? 0 }));
    }
    return out;
  }, [filteredByChannel]);

  // Sparklines for KPI cards
  const spendSparkline = filteredOverall.map((d) => ({ value: d.spend_usd }));
  const customerSparkline = filteredOverall.map((d) => ({ value: d.customers_acquired }));
  const conversionSparkline = filteredOverall.map((d) => ({ value: d.conversions }));
  const qaSparkline = filteredOverall.map((d) => ({ value: d.qualified_actions }));

  const headlines = React.useMemo(
    () => computeHeadlines(channelMetrics, attribution, branded),
    [channelMetrics, attribution, branded],
  );

  return (
    <>
      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          accent
          label="Blended ROAS"
          value={`${kpi.blendedRoas.toFixed(2)}×`}
          hint="Conversion revenue ÷ total paid spend"
          sublabel={rangeLabel(range)}
        />
        <KpiCard
          label="Ad spend"
          value={formatUSD(kpi.spend)}
          hint={`${rangeLabel(range)} · paid channels only`}
          sparkline={spendSparkline}
        />
        <KpiCard
          label="Customers acquired"
          value={formatNumber(kpi.customers_acquired)}
          hint="Distinct identified customers"
          sparkline={customerSparkline}
        />
        <KpiCard
          label="Conversions"
          value={formatNumber(kpi.conversions)}
          hint={`${formatUSD(kpi.conversion_value_usd)} total transacted`}
          sparkline={conversionSparkline}
        />
        <KpiCard
          label="Qualified actions"
          value={formatNumber(kpi.qualified_actions)}
          hint="Demo/consult/cart — mid-funnel intent"
          sparkline={qaSparkline}
        />
        <KpiCard
          label="True cost per conversion"
          value={kpi.cpa > 0 ? formatUSD(kpi.cpa) : '—'}
          hint="Total spend ÷ total conversions"
        />
        <KpiCard
          label="Pipeline value"
          value={formatUSD(pipelineValue)}
          hint="Σ predicted_conversion × predicted_ltv (current)"
        />
        <KpiCard
          label="Avg AOV"
          value={kpi.aov > 0 ? formatUSD(kpi.aov) : '—'}
          hint="Per converted customer"
        />
      </div>

      {/* Headline insights */}
      <div className="grid gap-3 sm:grid-cols-3">
        {headlines.map((h) => (
          <Card key={h.title} className="bg-secondary/40 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2.5">
                <Sparkles className="h-3.5 w-3.5 mt-0.5 text-accent shrink-0" />
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h.title}
                  </div>
                  <div className="mt-1 text-[13px] text-foreground leading-snug">{h.body}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeseries */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Spend, customers & conversions</CardTitle>
            <CardDescription>
              Composite view bucketed by day (or week when range exceeds 90 days).
            </CardDescription>
          </div>
          <Link
            href="/channels"
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
          >
            Break down by channel <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          <OverviewTimeseries data={dailyOverall} endDate={endDate} />
        </CardContent>
      </Card>

      {/* Channel summary */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Channel performance summary</CardTitle>
            <CardDescription>
              Sortable. Sparklines show daily spend trajectory over the selected window.
            </CardDescription>
          </div>
          <Link
            href="/channels"
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
          >
            Full breakdown <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          <ChannelSummaryTable
            metrics={channelMetrics}
            daily={dailyOverall}
            spendByChannelByDate={spendByChannelByDate}
          />
        </CardContent>
      </Card>
    </>
  );
}

function rangeLabel(range: string): string {
  return (
    {
      '30d': 'Last 30 days',
      '90d': 'Last 90 days',
      '180d': 'Last 6 months',
      '365d': 'Last 12 months',
      '720d': 'Last 24 months',
      all: 'All time',
    } as Record<string, string>
  )[range] ?? '';
}

interface Headline {
  title: string;
  body: string;
}

function computeHeadlines(
  metrics: ChannelMetrics[],
  attribution: AttributionWeights,
  branded: BrandedSearchBreakdown,
): Headline[] {
  const out: Headline[] = [];

  // Branded search highlight — operator's specialty
  if (branded.branded.roas > 0) {
    out.push({
      title: 'Branded search',
      body: `Google Branded campaigns return ${branded.branded.roas.toFixed(1)}× ROAS on just ${formatPercent(
        branded.branded.share_of_google_spend,
        1,
      )} of Google spend — ${formatPercent(branded.branded.share_of_google_value, 0)} of the channel's revenue.`,
    });
  }

  const paid = metrics.filter((m) => m.spend_usd > 0);
  if (paid.length > 0) {
    const bestCpa = [...paid].filter((p) => p.cpa > 0).sort((a, b) => a.cpa - b.cpa)[0];
    if (bestCpa) {
      const avgCpa =
        paid.filter((p) => p.cpa > 0).reduce((a, m) => a + m.cpa, 0) /
        Math.max(1, paid.filter((p) => p.cpa > 0).length);
      out.push({
        title: 'Best CPA',
        body: `${labelOf(bestCpa.channel)} converts at ${formatUSD(bestCpa.cpa)} — ${(
          avgCpa / bestCpa.cpa
        ).toFixed(1)}× more efficient than the paid average.`,
      });
    }

    const worstRoas = [...paid]
      .filter((p) => p.spend_usd > 50000 && p.roas > 0)
      .sort((a, b) => a.roas - b.roas)[0];
    if (worstRoas) {
      out.push({
        title: 'Underperformer',
        body: `${labelOf(worstRoas.channel)} returns ${worstRoas.roas.toFixed(
          2,
        )}× ROAS on ${formatUSD(worstRoas.spend_usd)} spend — ${formatPercent(
          worstRoas.share_of_spend,
          1,
        )} of budget for ${formatNumber(worstRoas.conversions)} conversions.`,
      });
    }
  }

  // Markov vs last-click attribution delta
  const channels = Object.keys(attribution.last_click) as Channel[];
  let biggestDelta: { channel: Channel; delta: number } | null = null;
  for (const c of channels) {
    const delta = (attribution.markov[c] ?? 0) - (attribution.last_click[c] ?? 0);
    if (!biggestDelta || Math.abs(delta) > Math.abs(biggestDelta.delta)) {
      biggestDelta = { channel: c, delta };
    }
  }
  if (biggestDelta && Math.abs(biggestDelta.delta) > 0.005) {
    const direction = biggestDelta.delta > 0 ? 'under-credits' : 'over-credits';
    out.push({
      title: 'Attribution gap',
      body: `Last-click ${direction} ${labelOf(biggestDelta.channel)} by ${formatPercent(
        Math.abs(biggestDelta.delta),
      )} relative to the Markov chain model. See /attribution.`,
    });
  }

  return out;
}

function labelOf(c: Channel): string {
  const m: Record<Channel, string> = {
    google: 'Google Ads',
    meta: 'Meta Ads',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    snapchat: 'Snapchat',
    referral: 'Referral',
    organic: 'Organic',
    direct: 'Direct',
    email: 'Email',
  };
  return m[c];
}
