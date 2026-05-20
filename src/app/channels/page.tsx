import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChannelCards } from '@/components/channel-cards';
import { EfficiencyScatter } from '@/components/charts/efficiency-scatter';
import { CampaignTable, type CampaignRow } from '@/components/campaign-table';
import { TopCreatives } from '@/components/top-creatives';
import { getAdSpend, getCreatives, getSummary } from '@/lib/data';
import { CHANNELS, type Channel } from '@/lib/types';

export default function ChannelsPage() {
  const summary = getSummary();
  const adSpend = getAdSpend();
  const creatives = getCreatives();

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

  // Aggregate campaigns server-side so we don't ship 16k rows to the client
  const campaignsMap = new Map<string, CampaignRow>();
  for (const r of adSpend) {
    const cur = campaignsMap.get(r.campaign_id) ?? {
      campaign_id: r.campaign_id,
      campaign_name: r.campaign_name,
      channel: r.channel,
      impressions: 0,
      clicks: 0,
      spend: 0,
      platform_conversions: 0,
    };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    cur.spend += r.spend_usd;
    cur.platform_conversions += r.platform_conversions;
    campaignsMap.set(r.campaign_id, cur);
  }
  const campaigns: CampaignRow[] = Array.from(campaignsMap.values());

  // Top Google keywords (mocked from creative names)
  const topKeywords = topGoogleKeywords(adSpend);

  return (
    <div className="space-y-8">
      <div className="space-y-2 max-w-3xl">
        <Badge variant="accent" className="w-fit">Channel Performance</Badge>
        <h1 className="font-display text-3xl font-medium tracking-tight text-balance">
          Where the dollars go, and what they bring back.
        </h1>
        <p className="text-sm text-muted-foreground">
          Per-channel CPC, CPL, CPQA, CPA, ROAS and conversion rate. Use the efficiency
          scatter to spot channels burning budget without proportional outcomes.
        </p>
      </div>

      <ChannelCards
        metrics={summary.channel_metrics}
        spendByChannelByDate={spendByChannelByDate}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cost-per-conversion vs share-of-spend</CardTitle>
          <CardDescription>
            Bubble size is conversions. Channels above the dashed line are above-average CPA —
            below the line are more efficient than the paid blend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EfficiencyScatter metrics={summary.channel_metrics} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campaign breakdown</CardTitle>
          <CardDescription>
            Top 50 campaigns by spend across the period. Switch tabs to drill into a channel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="meta">Meta</TabsTrigger>
              <TabsTrigger value="tiktok">TikTok</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
              <TabsTrigger value="snapchat">Snapchat</TabsTrigger>
            </TabsList>
            <TabsContent value="all"><CampaignTable campaigns={campaigns} /></TabsContent>
            <TabsContent value="google"><CampaignTable campaigns={campaigns} selectedChannel="google" /></TabsContent>
            <TabsContent value="meta"><CampaignTable campaigns={campaigns} selectedChannel="meta" /></TabsContent>
            <TabsContent value="tiktok"><CampaignTable campaigns={campaigns} selectedChannel="tiktok" /></TabsContent>
            <TabsContent value="linkedin"><CampaignTable campaigns={campaigns} selectedChannel="linkedin" /></TabsContent>
            <TabsContent value="snapchat"><CampaignTable campaigns={campaigns} selectedChannel="snapchat" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Meta creatives by attributed conversions</CardTitle>
            <CardDescription>Platform-attributed conversions, ranked by volume.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopCreatives creatives={creatives} adSpend={adSpend} channel="meta" limit={3} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Google keywords by attributed conversions</CardTitle>
            <CardDescription>Derived from ad-group naming conventions.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topKeywords.map((k) => (
                <li
                  key={k.keyword}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card px-3 py-2"
                >
                  <span className="font-mono text-[12.5px] text-foreground">{k.keyword}</span>
                  <span className="flex items-center gap-4 text-[11px] tabular text-muted-foreground">
                    <span><span className="font-medium text-foreground">{k.conversions}</span> conv.</span>
                    <span>${k.spend.toFixed(0)} spent</span>
                    <span>${k.cpa.toFixed(0)} CPA</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function topGoogleKeywords(adSpend: ReturnType<typeof getAdSpend>) {
  const map = new Map<string, { keyword: string; spend: number; conversions: number; cpa: number }>();
  for (const r of adSpend) {
    if (r.channel !== 'google') continue;
    // Use ad_group_name as the proxy for keyword theme
    const key = r.ad_group_name;
    const cur = map.get(key) ?? { keyword: key, spend: 0, conversions: 0, cpa: 0 };
    cur.spend += r.spend_usd;
    cur.conversions += r.platform_conversions;
    map.set(key, cur);
  }
  return Array.from(map.values())
    .map((k) => ({ ...k, cpa: k.conversions > 0 ? k.spend / k.conversions : 0 }))
    .filter((k) => k.conversions > 0)
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 8);
}
