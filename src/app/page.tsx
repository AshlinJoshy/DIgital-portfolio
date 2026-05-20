import { ArrowUpRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KpiCard } from '@/components/kpi-card';
import { DateRangeProvider, DateRangePicker } from '@/components/date-range-context';
import { OverviewTimeseries } from '@/components/charts/overview-timeseries';
import { ChannelSummaryTable } from '@/components/channel-summary-table';
import { Badge } from '@/components/ui/badge';
import { getAdSpend, getSummary } from '@/lib/data';
import { formatNumber, formatUSD, formatPercent } from '@/lib/utils';
import type { Channel, DailyTimeseries } from '@/lib/types';
import { CHANNELS } from '@/lib/types';

export default function OverviewPage() {
  const summary = getSummary();
  const adSpend = getAdSpend();

  const kpi = summary.kpi_summary;
  const daily = summary.daily_timeseries;
  const spendSparkline = daily.map((d) => ({ value: d.spend_usd }));
  const customerSparkline = daily.map((d) => ({ value: d.customers_acquired }));
  const conversionSparkline = daily.map((d) => ({ value: d.conversions }));
  const qaSparkline = daily.map((d) => ({ value: d.qualified_actions }));

  // build per-channel daily spend for sparklines in the table
  const spendByChannelByDate: Record<Channel, { date: string; value: number }[]> = Object.fromEntries(
    CHANNELS.map((c) => [c, [] as { date: string; value: number }[]]),
  ) as Record<Channel, { date: string; value: number }[]>;
  const allDates = Array.from(new Set(adSpend.map((r) => r.date))).sort();
  const spendMap: Record<string, Record<Channel, number>> = {};
  for (const r of adSpend) {
    spendMap[r.date] = spendMap[r.date] ?? ({} as Record<Channel, number>);
    spendMap[r.date][r.channel] = (spendMap[r.date][r.channel] ?? 0) + r.spend_usd;
  }
  for (const date of allDates) {
    for (const c of CHANNELS) {
      spendByChannelByDate[c].push({ date, value: spendMap[date]?.[c] ?? 0 });
    }
  }

  // Top-line storylines surfaced as "headline insights"
  const headlines = computeHeadlines(summary.channel_metrics, summary.attribution_weights);

  return (
    <DateRangeProvider>
      <div className="space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-card/30 px-6 py-8 sm:px-10 sm:py-12">
          <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(circle_at_top_right,white,transparent_70%)]" />
          <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3 max-w-3xl">
              <Badge variant="accent" className="w-fit">Executive Overview</Badge>
              <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-balance">
                One view of every dollar, every channel, every customer.
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Spend, performance, and outcomes across Google Ads, Meta, TikTok, LinkedIn,
                Snapchat, plus organic, direct, referral and email — joined to customer journeys
                from PostHog, GA4, and the internal CRM.
              </p>
            </div>
            <DateRangePicker />
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            accent
            label="Ad spend"
            value={formatUSD(kpi.total_spend_usd)}
            hint="Last 180 days · paid channels only"
            sparkline={spendSparkline}
          />
          <KpiCard
            label="Customers acquired"
            value={formatNumber(kpi.customers_acquired)}
            hint="Distinct identified customers"
            sparkline={customerSparkline}
          />
          <KpiCard
            label="Qualified actions"
            value={formatNumber(kpi.qualified_actions)}
            hint="Demo/consult/cart — mid-funnel intent"
            sparkline={qaSparkline}
          />
          <KpiCard
            label="Conversions"
            value={formatNumber(kpi.conversions)}
            hint={`${formatUSD(kpi.conversion_value_usd)} total transacted`}
            sparkline={conversionSparkline}
          />
          <KpiCard
            label="True cost per conversion"
            value={formatUSD(kpi.true_cost_per_conversion)}
            hint="Total spend ÷ total conversions"
          />
          <KpiCard
            label="Pipeline value"
            value={formatUSD(kpi.pipeline_value_usd)}
            hint="Σ predicted_conversion × predicted_ltv"
          />
          <KpiCard
            label="Blended ROAS"
            value={`${kpi.blended_roas.toFixed(2)}×`}
            hint="Conversion revenue ÷ spend"
            sublabel="all channels"
          />
          <KpiCard
            label="Avg AOV"
            value={formatUSD(kpi.conversions ? kpi.conversion_value_usd / kpi.conversions : 0)}
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
            <OverviewTimeseries data={daily} endDate={summary.date_range.end} />
          </CardContent>
        </Card>

        {/* Channel summary */}
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Channel performance summary</CardTitle>
              <CardDescription>
                Sortable. Sparklines show daily spend trajectory over the period.
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
              metrics={summary.channel_metrics}
              daily={daily}
              spendByChannelByDate={spendByChannelByDate}
            />
          </CardContent>
        </Card>
      </div>
    </DateRangeProvider>
  );
}

interface Headline {
  title: string;
  body: string;
}

function computeHeadlines(
  metrics: ReturnType<typeof getSummary>['channel_metrics'],
  attribution: ReturnType<typeof getSummary>['attribution_weights'],
): Headline[] {
  const out: Headline[] = [];

  const paid = metrics.filter((m) => m.spend_usd > 0);
  const bestCpa = [...paid].sort((a, b) => a.cpa - b.cpa)[0];
  if (bestCpa) {
    out.push({
      title: 'Best CPA',
      body: `${labelOf(bestCpa.channel)} converts at ${formatUSD(bestCpa.cpa)} — ${(
        (paid.reduce((a, m) => a + m.cpa, 0) / paid.length) /
        bestCpa.cpa
      ).toFixed(1)}× more efficient than the paid average.`,
    });
  }

  const worstRoas = [...paid].filter((p) => p.spend_usd > 50000).sort((a, b) => a.roas - b.roas)[0];
  if (worstRoas) {
    out.push({
      title: 'Underperformer',
      body: `${labelOf(worstRoas.channel)} returns ${worstRoas.roas.toFixed(2)}× ROAS on ${formatUSD(
        worstRoas.spend_usd,
      )} spend — ${formatPercent(worstRoas.share_of_spend, 1)} of budget for ${formatNumber(
        worstRoas.conversions,
      )} conversions.`,
    });
  }

  // Markov vs last-click delta — surface biggest shift
  const channels = Object.keys(attribution.last_click) as Channel[];
  let biggestDelta: { channel: Channel; delta: number } | null = null;
  for (const c of channels) {
    const delta = attribution.markov[c] - attribution.last_click[c];
    if (!biggestDelta || Math.abs(delta) > Math.abs(biggestDelta.delta)) {
      biggestDelta = { channel: c, delta };
    }
  }
  if (biggestDelta) {
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
    meta: 'Meta',
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
