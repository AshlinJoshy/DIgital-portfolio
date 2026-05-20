import { Badge } from '@/components/ui/badge';
import { DateRangeProvider, DateRangePicker } from '@/components/date-range-context';
import { OverviewMetrics } from '@/components/overview-metrics';
import { getAdSpend, getDailyByChannel, getSummary } from '@/lib/data';
import { CHANNELS, type Channel } from '@/lib/types';

export default function OverviewPage() {
  const summary = getSummary();
  const dailyByChannel = getDailyByChannel();
  const adSpend = getAdSpend();

  // Per-channel all-time totals for impressions/clicks (used as fallback when
  // filtered slice has no clicks/impressions for legacy channels).
  const channelImpressionsTotal: Record<Channel, number> = Object.fromEntries(
    CHANNELS.map((c) => [c, 0]),
  ) as Record<Channel, number>;
  const channelClicksTotal: Record<Channel, number> = Object.fromEntries(
    CHANNELS.map((c) => [c, 0]),
  ) as Record<Channel, number>;
  for (const r of adSpend) {
    channelImpressionsTotal[r.channel] += r.impressions;
    channelClicksTotal[r.channel] += r.clicks;
  }

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
                Spend, performance, and outcomes across Google Ads, Meta Ads, TikTok, LinkedIn,
                Snapchat, plus organic, direct, referral and email — joined to customer journeys
                from PostHog, GA4, and the internal CRM.
              </p>
            </div>
            <DateRangePicker />
          </div>
        </div>

        <OverviewMetrics
          dailyByChannel={dailyByChannel}
          dailyOverall={summary.daily_timeseries}
          channelImpressionsTotal={channelImpressionsTotal}
          channelClicksTotal={channelClicksTotal}
          pipelineValue={summary.kpi_summary.pipeline_value_usd}
          attribution={summary.attribution_weights}
          branded={summary.branded_search_breakdown}
          endDate={summary.date_range.end}
        />
      </div>
    </DateRangeProvider>
  );
}
