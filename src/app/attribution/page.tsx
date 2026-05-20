import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChannelIcon } from '@/components/channel-icon';
import { getSummary } from '@/lib/data';
import { CHANNELS, CHANNEL_LABELS, type Channel } from '@/lib/types';
import { cn, formatPercent, formatUSD } from '@/lib/utils';

export default function AttributionPage() {
  const summary = getSummary();
  const w = summary.attribution_weights;
  const metrics = summary.channel_metrics;
  const totalSpend = metrics.reduce((a, m) => a + m.spend_usd, 0);
  const totalConv = summary.kpi_summary.conversions;
  const totalRevenue = summary.kpi_summary.conversion_value_usd;

  // For each channel: actual share of spend vs Markov-implied share of credit
  const rows = (CHANNELS as Channel[])
    .map((c) => {
      const m = metrics.find((x) => x.channel === c);
      const spend = m?.spend_usd ?? 0;
      const shareSpend = totalSpend > 0 ? spend / totalSpend : 0;
      const shareMarkov = w.markov[c] ?? 0;
      const shareLastClick = w.last_click[c] ?? 0;
      // Implied "ideal" spend if budget allocation matched Markov credit
      const idealSpend = totalSpend * shareMarkov;
      const recommendedDelta = idealSpend - spend;
      const recommendedConversionShift = totalConv * (shareMarkov - shareSpend);
      const recommendedRevenueShift = totalRevenue * (shareMarkov - shareLastClick);
      return {
        channel: c,
        spend,
        shareSpend,
        shareMarkov,
        shareLastClick,
        idealSpend,
        recommendedDelta,
        recommendedConversionShift,
        recommendedRevenueShift,
      };
    })
    .filter((r) => r.shareSpend > 0 || r.shareMarkov > 0.005)
    .sort((a, b) => Math.abs(b.recommendedDelta) - Math.abs(a.recommendedDelta));

  // The headline recommendation(s)
  const cuts = rows.filter((r) => r.recommendedDelta < 0).slice(0, 2);
  const adds = rows.filter((r) => r.recommendedDelta > 0).slice(0, 2);

  return (
    <div className="space-y-8">
      <div className="space-y-2 max-w-3xl">
        <Badge variant="accent" className="w-fit">Attribution-driven reallocation</Badge>
        <h1 className="font-display text-3xl font-medium tracking-tight text-balance">
          Move budget to where the chain actually breaks.
        </h1>
        <p className="text-sm text-muted-foreground">
          The Markov chain model tells us how essential each channel is to the path that ends
          in a conversion. Comparing channel <em>credit</em> against current channel <em>spend</em> reveals
          where you&apos;re structurally over- or under-invested.
        </p>
      </div>

      {/* Headline insights */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[...cuts, ...adds].map((r) => {
          const isAdd = r.recommendedDelta > 0;
          return (
            <Card
              key={r.channel}
              className={cn(
                'border-2',
                isAdd ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-rose-500/30 bg-rose-500/[0.03]',
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ChannelIcon channel={r.channel} size={28} />
                    <div>
                      <div className="font-display text-base font-medium">
                        {CHANNEL_LABELS[r.channel]}
                      </div>
                      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                        {isAdd ? 'Recommended: invest more' : 'Recommended: reallocate away'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 text-[12px] font-medium tabular',
                      isAdd ? 'text-emerald-500' : 'text-rose-500',
                    )}
                  >
                    {isAdd ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {formatUSD(Math.abs(r.recommendedDelta), { compact: true })}
                  </div>
                </div>

                <p className="mt-4 text-[13px] leading-snug text-foreground">
                  Currently <strong className="font-medium tabular">{formatPercent(r.shareSpend, 1)}</strong> of paid budget,
                  but Markov credit is{' '}
                  <strong className="font-medium tabular">{formatPercent(r.shareMarkov, 1)}</strong>.{' '}
                  Last-click gives it{' '}
                  <strong className="font-medium tabular">{formatPercent(r.shareLastClick, 1)}</strong>{' '}— which is{' '}
                  {Math.abs(r.shareLastClick - r.shareMarkov) > 0.04
                    ? 'meaningfully off'
                    : 'roughly aligned'}
                  .
                </p>

                {isAdd && (
                  <div className="mt-3 text-[12px] text-muted-foreground">
                    Shifting <span className="font-medium text-foreground">{formatUSD(Math.abs(r.recommendedDelta), { compact: true })}</span>{' '}
                    into {CHANNEL_LABELS[r.channel]} from the largest reallocation source could yield an
                    estimated{' '}
                    <span className="font-medium text-emerald-500 tabular">
                      +{Math.round(Math.abs(r.recommendedConversionShift))}
                    </span>{' '}
                    additional conversions over the period at constant CPA.
                  </div>
                )}
                {!isAdd && (
                  <div className="mt-3 text-[12px] text-muted-foreground">
                    {CHANNEL_LABELS[r.channel]} is over-credited in last-click reports. Trimming{' '}
                    <span className="font-medium text-foreground">{formatUSD(Math.abs(r.recommendedDelta), { compact: true })}</span>{' '}
                    and redirecting to the largest reallocation target would free up budget without
                    proportionally losing chain-essential traffic.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reallocation matrix</CardTitle>
          <CardDescription>
            Markov share is the channel&apos;s removal effect normalized across the chain.
            Δ tells you how much spend would move to align budget with credit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border/60 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 px-2 text-left font-medium">Channel</th>
                  <th className="py-2 px-2 text-right font-medium">Current spend</th>
                  <th className="py-2 px-2 text-right font-medium">Share of spend</th>
                  <th className="py-2 px-2 text-right font-medium">Last-click share</th>
                  <th className="py-2 px-2 text-right font-medium">Markov share</th>
                  <th className="py-2 px-2 text-right font-medium">Implied ideal</th>
                  <th className="py-2 px-2 text-right font-medium">Δ Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.channel}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <ChannelIcon channel={r.channel} size={18} />
                        <span className="font-medium">{CHANNEL_LABELS[r.channel]}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right tabular">
                      {r.spend > 0 ? formatUSD(r.spend) : '—'}
                    </td>
                    <td className="py-2 px-2 text-right tabular text-muted-foreground">
                      {r.spend > 0 ? formatPercent(r.shareSpend, 1) : '—'}
                    </td>
                    <td className="py-2 px-2 text-right tabular text-muted-foreground">
                      {formatPercent(r.shareLastClick, 1)}
                    </td>
                    <td className="py-2 px-2 text-right tabular font-medium">
                      {formatPercent(r.shareMarkov, 1)}
                    </td>
                    <td className="py-2 px-2 text-right tabular">{formatUSD(r.idealSpend)}</td>
                    <td className="py-2 px-2 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-medium tabular',
                          r.recommendedDelta > 0 ? 'text-emerald-500' : 'text-rose-500',
                          r.spend === 0 && 'text-muted-foreground',
                        )}
                      >
                        {r.recommendedDelta !== 0 &&
                          (r.recommendedDelta > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          ))}
                        {r.spend > 0 && r.recommendedDelta !== 0
                          ? `${r.recommendedDelta > 0 ? '+' : ''}${formatUSD(r.recommendedDelta, {
                              compact: true,
                            })}`
                          : 'n/a'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/20 bg-accent/[0.04]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            What this is and what it isn't <ArrowRight className="h-4 w-4 text-accent" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[13px] text-muted-foreground">
          <p>
            This isn't a forecast. Reallocation recommendations are derived from the Markov chain
            <strong className="text-foreground"> credit distribution</strong>, which captures how
            essential each channel is to the journey reaching a conversion. The implied dollar
            amounts assume CPA holds steady — in practice, marginal CPAs degrade as a channel
            scales, so use these as <strong className="text-foreground">directional guidance</strong>,
            not a budget commitment.
          </p>
          <p>
            In production this view would also incorporate a <strong className="text-foreground">scaling-elasticity model</strong>
            per channel (CPM curves from the Ads APIs, saturation in audiences) before publishing
            the dollar figures. The Markov layer answers <em>where credit really lives</em>; the
            elasticity layer answers <em>how far you can push it</em>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
