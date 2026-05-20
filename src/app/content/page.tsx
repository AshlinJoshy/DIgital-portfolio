import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TopCreatives } from '@/components/top-creatives';
import { getAdSpend, getCreatives, getSummary } from '@/lib/data';
import { formatNumber } from '@/lib/utils';

export default function ContentPage() {
  const summary = getSummary();
  const creatives = getCreatives();
  const adSpend = getAdSpend();

  const maxLift = Math.max(...summary.word_resonance.map((w) => w.lift), 1);
  const maxCount = Math.max(...summary.intent_theme_frequency.map((t) => t.count), 1);

  return (
    <div className="space-y-8">
      <div className="space-y-2 max-w-3xl">
        <Badge variant="accent" className="w-fit">Content & Message Resonance</Badge>
        <h1 className="font-display text-3xl font-medium tracking-tight text-balance">
          What lands, and why.
        </h1>
        <p className="text-sm text-muted-foreground">
          Which ad creatives drive the highest conversion volume, which intent themes show up
          most often in customer behaviour, and which specific phrases lift conversion vs the
          baseline. Intent tags are LLM-classified at the customer interaction level.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top performing creatives</CardTitle>
          <CardDescription>
            Ranked by attributed conversions. Switch tabs to view by platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="all">All platforms</TabsTrigger>
              <TabsTrigger value="meta">Meta</TabsTrigger>
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="tiktok">TikTok</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <TopCreatives creatives={creatives} adSpend={adSpend} limit={6} />
            </TabsContent>
            <TabsContent value="meta">
              <TopCreatives creatives={creatives} adSpend={adSpend} channel="meta" limit={6} />
            </TabsContent>
            <TabsContent value="google">
              <TopCreatives creatives={creatives} adSpend={adSpend} channel="google" limit={6} />
            </TabsContent>
            <TabsContent value="tiktok">
              <TopCreatives creatives={creatives} adSpend={adSpend} channel="tiktok" limit={6} />
            </TabsContent>
            <TabsContent value="linkedin">
              <TopCreatives creatives={creatives} adSpend={adSpend} channel="linkedin" limit={6} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>What words convert?</CardTitle>
            <CardDescription>
              Phrases that appear disproportionately in conversion-driving creatives vs the
              broader corpus. Lift = P(phrase | converted) ÷ P(phrase | not converted).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {summary.word_resonance.slice(0, 12).map((w) => (
                <div key={w.phrase} className="flex items-center gap-3 group">
                  <span className="font-mono text-[12px] w-[140px] truncate text-foreground">
                    {w.phrase}
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-accent/80 transition-all"
                      style={{ width: `${Math.min(100, (w.lift / maxLift) * 100)}%` }}
                    />
                    <div className="absolute inset-y-0 left-1.5 flex items-center text-[10px] text-background/95 font-medium tabular">
                      {w.lift.toFixed(1)}× lift
                    </div>
                  </div>
                  <span className="text-[10.5px] tabular text-muted-foreground w-[60px] text-right">
                    {w.conversion_count} conv.
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intent theme frequency</CardTitle>
            <CardDescription>
              LLM-classified intent tags across all customer interactions. Use this to spot which
              messaging angles match what prospects are actually expressing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.intent_theme_frequency.map((t) => (
                <div key={t.tag}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="font-medium">{t.tag}</span>
                    <span className="tabular text-muted-foreground">{formatNumber(t.count)} customers</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(t.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/40 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Methodology:</span> in production these
              tags would come from an LLM classifying each support conversation, form note, chat
              transcript and click pattern into one of these themes — surfaced here pre-tagged on
              the mock customers.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Landing page resonance</CardTitle>
          <CardDescription>
            Top landing pages by engagement-to-conversion ratio. Derived from session-level data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LandingPageTable />
        </CardContent>
      </Card>
    </div>
  );
}

function LandingPageTable() {
  // mock derived sample (would compute from sessions but we want the page lean)
  const rows = [
    { page: '/lp/comparison', sessions: 4220, engaged: 0.71, qa: 0.18, conv: 0.046 },
    { page: '/lp/premium-experience', sessions: 3850, engaged: 0.65, qa: 0.16, conv: 0.038 },
    { page: '/pricing', sessions: 5410, engaged: 0.59, qa: 0.21, conv: 0.054 },
    { page: '/collections/signature', sessions: 3020, engaged: 0.62, qa: 0.13, conv: 0.029 },
    { page: '/lp/save-20', sessions: 2750, engaged: 0.51, qa: 0.11, conv: 0.022 },
    { page: '/blog/buyers-guide', sessions: 1880, engaged: 0.78, qa: 0.08, conv: 0.012 },
    { page: '/', sessions: 8970, engaged: 0.42, qa: 0.07, conv: 0.014 },
  ];
  return (
    <table className="w-full text-[12.5px]">
      <thead>
        <tr className="border-b border-border/60 text-[10.5px] uppercase tracking-wider text-muted-foreground">
          <th className="py-2 px-2 text-left font-medium">Landing page</th>
          <th className="py-2 px-2 text-right font-medium">Sessions</th>
          <th className="py-2 px-2 text-right font-medium">Engaged rate</th>
          <th className="py-2 px-2 text-right font-medium">QA rate</th>
          <th className="py-2 px-2 text-right font-medium">Conv. rate</th>
          <th className="py-2 px-2 text-right font-medium">Resonance</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const score = r.engaged * r.qa * r.conv * 1000;
          return (
            <tr key={r.page} className="border-b border-border/30 hover:bg-secondary/30">
              <td className="py-2 px-2 font-mono text-[12px]">{r.page}</td>
              <td className="py-2 px-2 text-right tabular">{r.sessions.toLocaleString()}</td>
              <td className="py-2 px-2 text-right tabular text-muted-foreground">
                {(r.engaged * 100).toFixed(0)}%
              </td>
              <td className="py-2 px-2 text-right tabular text-muted-foreground">
                {(r.qa * 100).toFixed(1)}%
              </td>
              <td className="py-2 px-2 text-right tabular font-medium">
                {(r.conv * 100).toFixed(2)}%
              </td>
              <td className="py-2 px-2 text-right">
                <div className="inline-flex items-center gap-1.5 w-[80px] justify-end">
                  <div className="h-1 w-[60px] bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.min(100, score * 8)}%` }}
                    />
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
