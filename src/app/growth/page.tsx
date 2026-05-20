import { ArrowUpRight, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandGrowthChart } from '@/components/charts/brand-growth-chart';
import { FollowerGrowth } from '@/components/charts/follower-growth';

const FOLLOWER_LABELS = {
  instagram_followers: 'Instagram followers',
  tiktok_followers: 'TikTok followers',
  branded_search_volume: 'Branded search volume (monthly)',
  google_quality_score: 'Google Ads Quality Score (avg)',
} as const;
import { getBrandGrowth, getSummary } from '@/lib/data';
import { formatNumber, formatPercent, formatUSD } from '@/lib/utils';

export default function GrowthPage() {
  const months = getBrandGrowth();
  const summary = getSummary();

  if (months.length < 2) {
    return <div className="text-sm text-muted-foreground">No growth data available.</div>;
  }
  const first = months[0];
  const last = months[months.length - 1];

  const peakMonth = [...months].sort((a, b) => b.paid_spend_usd - a.paid_spend_usd)[0];
  const totalSpend = months.reduce((a, m) => a + m.paid_spend_usd, 0);
  const totalCustomers = months.reduce((a, m) => a + m.customers_acquired, 0);

  const milestones = months.filter((m) => m.milestone);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card to-card/30 px-6 py-8 sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(circle_at_top_right,white,transparent_70%)]" />
        <div className="absolute -right-32 -top-32 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative space-y-3 max-w-3xl">
          <Badge variant="accent" className="w-fit">Brand build-up · 24 months</Badge>
          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-balance">
            From paid testing to a brand people search by name.
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Two years of compounded effort across Google, Meta, TikTok, LinkedIn and content —
            captured month-by-month. Watch the budget scale, the audiences grow, the Quality
            Score climb, and the share of demand shift from paid acquisition to direct & organic.
          </p>
        </div>
      </div>

      {/* Before / After summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GrowthDelta
          label="Monthly paid spend"
          before={formatUSD(first.paid_spend_usd, { compact: true })}
          after={formatUSD(last.paid_spend_usd, { compact: true })}
          factor={last.paid_spend_usd / Math.max(1, first.paid_spend_usd)}
        />
        <GrowthDelta
          label="Instagram followers"
          before={formatNumber(first.instagram_followers, true)}
          after={formatNumber(last.instagram_followers, true)}
          factor={last.instagram_followers / Math.max(1, first.instagram_followers)}
        />
        <GrowthDelta
          label="TikTok followers"
          before={formatNumber(first.tiktok_followers, true)}
          after={formatNumber(last.tiktok_followers, true)}
          factor={last.tiktok_followers / Math.max(1, first.tiktok_followers)}
        />
        <GrowthDelta
          label="Branded search / mo"
          before={formatNumber(first.branded_search_volume, true)}
          after={formatNumber(last.branded_search_volume, true)}
          factor={last.branded_search_volume / Math.max(1, first.branded_search_volume)}
        />
        <GrowthDelta
          label="Google Quality Score"
          before={first.google_quality_score.toFixed(1)}
          after={last.google_quality_score.toFixed(1)}
          delta={`+${(last.google_quality_score - first.google_quality_score).toFixed(1)} pts`}
        />
        <GrowthDelta
          label="Organic share of sessions"
          before={formatPercent(first.organic_share_of_sessions, 0)}
          after={formatPercent(last.organic_share_of_sessions, 0)}
          delta={`+${formatPercent(
            last.organic_share_of_sessions - first.organic_share_of_sessions,
            0,
          )}`}
        />
        <GrowthDelta
          label="Customers (cumulative)"
          before="0"
          after={formatNumber(totalCustomers, true)}
        />
        <GrowthDelta
          label="Branded ROAS"
          before="—"
          after={`${summary.branded_search_breakdown.branded.roas.toFixed(1)}×`}
          delta={`${formatPercent(summary.branded_search_breakdown.branded.share_of_google_spend, 0)} of Google spend`}
        />
      </div>

      {/* Main growth chart */}
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Monthly paid spend, customers & conversions</CardTitle>
            <CardDescription>
              The deliberate scale-up. Dotted vertical lines mark strategic milestones in the
              brand build-out.
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Peak month
            </div>
            <div className="font-display text-base tabular">{fmtMonth(peakMonth.month)}</div>
            <div className="text-[10.5px] text-muted-foreground tabular">
              {formatUSD(peakMonth.paid_spend_usd)} spent
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BrandGrowthChart data={months} />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <Legend color="hsl(var(--accent))" label="Paid spend (USD)" />
            <Legend color="hsl(160 50% 45%)" label="Conversions" />
            <Legend color="hsl(220 75% 60%)" label="Customers acquired" dashed />
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic milestones</CardTitle>
          <CardDescription>
            Major decisions that shaped how the brand was built.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.month} className="flex items-start gap-3 rounded-md border border-border/40 p-3">
                <div className="shrink-0 w-16">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Month {m.month_index}
                  </div>
                  <div className="font-display tabular text-[13px]">{fmtMonth(m.month)}</div>
                </div>
                <Sparkles className="h-3.5 w-3.5 mt-1 text-accent shrink-0" />
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-foreground">{m.milestone}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground tabular">
                    Spend that month: {formatUSD(m.paid_spend_usd)} · Branded search:{' '}
                    {formatNumber(m.branded_search_volume)}/mo · QS: {m.google_quality_score.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audience growth: small multiples */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{FOLLOWER_LABELS.instagram_followers}</CardTitle>
            <CardDescription>
              From {formatNumber(first.instagram_followers, true)} to{' '}
              {formatNumber(last.instagram_followers, true)} —{' '}
              {(last.instagram_followers / first.instagram_followers).toFixed(1)}× growth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FollowerGrowth data={months} metric="instagram_followers" color="hsl(330 75% 60%)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{FOLLOWER_LABELS.tiktok_followers}</CardTitle>
            <CardDescription>
              From {formatNumber(first.tiktok_followers, true)} to{' '}
              {formatNumber(last.tiktok_followers, true)} —{' '}
              {(last.tiktok_followers / first.tiktok_followers).toFixed(1)}× growth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FollowerGrowth data={months} metric="tiktok_followers" color="hsl(340 75% 55%)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{FOLLOWER_LABELS.branded_search_volume}</CardTitle>
            <CardDescription>
              Direct demand for the brand name — the truest signal of brand strength.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FollowerGrowth data={months} metric="branded_search_volume" color="hsl(212 75% 55%)" unit="searches" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{FOLLOWER_LABELS.google_quality_score}</CardTitle>
            <CardDescription>
              Better ads + better landing pages + more relevant traffic. Lower CPCs as a result.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FollowerGrowth data={months} metric="google_quality_score" color="hsl(38 70% 55%)" />
          </CardContent>
        </Card>
      </div>

      {/* Branded search highlight */}
      <Card className="border-accent/30 bg-accent/[0.04]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Branded search: small spend, outsized return
          </CardTitle>
          <CardDescription>
            The bookend of the brand build-out — people typing the brand name into Google.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <StatLarge
              label="Branded ROAS"
              value={`${summary.branded_search_breakdown.branded.roas.toFixed(1)}×`}
              hint={`On ${formatPercent(summary.branded_search_breakdown.branded.share_of_google_spend, 1)} of Google spend`}
              emphasis
            />
            <StatLarge
              label="Non-branded ROAS"
              value={`${summary.branded_search_breakdown.non_branded.roas.toFixed(2)}×`}
              hint="The acquisition workhorse"
            />
            <StatLarge
              label="Branded contribution"
              value={formatPercent(summary.branded_search_breakdown.branded.share_of_google_value, 0)}
              hint="Of Google revenue"
            />
          </div>
          <p className="mt-5 text-[13px] text-muted-foreground leading-relaxed">
            Branded search costs <strong className="text-foreground">{formatUSD(summary.branded_search_breakdown.branded.spend_usd)}</strong>{' '}
            over 24 months and returned{' '}
            <strong className="text-foreground">{formatUSD(summary.branded_search_breakdown.branded.conversion_value_usd)}</strong> —
            that&apos;s {summary.branded_search_breakdown.branded.roas.toFixed(1)}× on every dollar.
            It works because awareness from the rest of the funnel (TikTok creators, Meta
            video, content marketing, partner placements) drives demand that lands here as
            high-intent, brand-aware traffic.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function GrowthDelta({
  label,
  before,
  after,
  factor,
  delta,
}: {
  label: string;
  before: string;
  after: string;
  factor?: number;
  delta?: string;
}) {
  return (
    <div className="surface p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[10.5px] text-muted-foreground tabular">{before}</div>
          <div className="font-display text-xl tabular text-foreground mt-0.5">{after}</div>
        </div>
        <div className="text-right shrink-0">
          {factor != null ? (
            <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tabular">
              <ArrowUpRight className="h-3 w-3" />
              {factor.toFixed(1)}×
            </div>
          ) : delta ? (
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-accent tabular">
              {delta}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatLarge({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        emphasis ? 'border-accent/40 bg-accent/5' : 'border-border/60 bg-card/50'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-display text-2xl tabular ${emphasis ? 'text-accent' : 'text-foreground'}`}
      >
        {value}
      </div>
      <div className="text-[10.5px] text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-4"
        style={{
          background: color,
          borderTop: dashed ? `2px dashed ${color}` : undefined,
        }}
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function fmtMonth(m: string): string {
  if (!m || m.length < 7) return m;
  const [year, month] = m.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
