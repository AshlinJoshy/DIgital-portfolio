import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JourneySankey } from '@/components/charts/journey-sankey';
import { AttributionComparison } from '@/components/charts/attribution-comparison';
import { PathLengthHistogram } from '@/components/charts/path-length';
import { ChannelIcon } from '@/components/channel-icon';
import { getJourneys, getSummary } from '@/lib/data';
import { buildSankey } from '@/lib/sankey-builder';
import { formatDays, formatPercent } from '@/lib/utils';

export default function JourneyPage() {
  const summary = getSummary();
  const journeys = getJourneys();

  const converted = journeys.filter((j) => j.converted);
  const avgPathLength =
    converted.reduce((a, j) => a + j.touchpoints.length, 0) / Math.max(1, converted.length);
  const sankeyData = buildSankey(journeys);

  return (
    <div className="space-y-8">
      <div className="space-y-2 max-w-3xl">
        <Badge variant="accent" className="w-fit">Customer Journey & Attribution</Badge>
        <h1 className="font-display text-3xl font-medium tracking-tight text-balance">
          The path from first impression to revenue.
        </h1>
        <p className="text-sm text-muted-foreground">
          Every customer interaction stitched together, visualised, then credited five different
          ways — including a real Markov chain model running on these journeys.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Multi-touch journey flow</CardTitle>
            <CardDescription>
              First touch → middle touchpoint → last touch → outcome. Channels below 2% share
              are collapsed into &quot;Other&quot; for legibility.
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Avg path length
            </div>
            <div className="font-display text-xl tabular">{avgPathLength.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground">touchpoints per conversion</div>
          </div>
        </CardHeader>
        <CardContent>
          <JourneySankey data={sankeyData} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attribution model comparison</CardTitle>
            <CardDescription>
              Same conversions, credited five different ways. The Markov row is the result of an
              absorbing-Markov-chain removal-effect calculation on this dataset — not a guess.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttributionComparison weights={summary.attribution_weights} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Path length distribution</CardTitle>
            <CardDescription>
              How many touchpoints did each customer have? Most customers cluster around{' '}
              {modeOf(summary.path_length_distribution)} touchpoints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PathLengthHistogram data={summary.path_length_distribution} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average time-to-conversion by first-touch channel</CardTitle>
          <CardDescription>
            From the very first impression to the purchase event. Channels with short windows
            tend to attract high-intent prospects; long windows indicate top-of-funnel awareness.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {summary.time_to_conversion_by_channel
              .filter((r) => r.mean_days > 0)
              .sort((a, b) => a.median_days - b.median_days)
              .map((r) => (
                <div
                  key={r.channel}
                  className="surface p-4 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={r.channel as never} size={20} />
                    <span className="text-[12.5px] font-medium">{labelOf(r.channel as never)}</span>
                  </div>
                  <div className="mt-3 font-display text-2xl tabular">
                    {formatDays(r.median_days)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    median · mean {formatDays(r.mean_days)}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/20 bg-accent/[0.04]">
        <CardHeader>
          <CardTitle>How to read this</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[13px] text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Last-click</span> is the model platforms
            report by default. It gives 100% credit to whichever channel was last seen — and is
            structurally biased toward bottom-funnel channels like Google Search.
          </p>
          <p>
            <span className="font-medium text-foreground">First-click</span> swings to the opposite
            extreme, crediting the discovery channel and ignoring everything that happened in
            between.
          </p>
          <p>
            <span className="font-medium text-foreground">Linear & time-decay</span> split credit
            across the path with mechanical weighting rules.
          </p>
          <p>
            <span className="font-medium text-foreground">Markov chain</span> is what's actually
            running here: I build an absorbing-Markov-chain transition matrix over every customer
            journey, then compute the <em>removal effect</em> — how much would conversions drop
            if a given channel disappeared? — and normalize to 100%. The number under each channel
            in the bar above answers: <em>how important is this channel to the chain reaching a
            conversion?</em>
          </p>
          <p className="text-[12px]">
            Full methodology, including the math and code, is on the{' '}
            <a href="/docs" className="text-accent underline-offset-2 hover:underline">
              /docs
            </a>{' '}
            page.
          </p>
          <p className="text-[12px]">
            Total Markov-credited revenue weight across channels:{' '}
            {formatPercent(
              Object.values(summary.attribution_weights.markov).reduce((a, b) => a + b, 0),
              0,
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function modeOf(d: { length: number; count: number }[]): number {
  if (d.length === 0) return 0;
  return d.reduce((a, b) => (b.count > a.count ? b : a)).length;
}

function labelOf(c: 'google' | 'meta' | 'tiktok' | 'linkedin' | 'snapchat' | 'referral' | 'organic' | 'direct' | 'email'): string {
  const m: Record<string, string> = {
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
  return m[c] ?? c;
}
