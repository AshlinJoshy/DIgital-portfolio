import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FunnelChart } from '@/components/charts/funnel-chart';
import { ChannelIcon } from '@/components/channel-icon';
import { getSummary } from '@/lib/data';
import { formatNumber, formatPercent } from '@/lib/utils';
import { CHANNEL_LABELS, type Channel } from '@/lib/types';

export default function FunnelPage() {
  const summary = getSummary();
  const f = summary.funnel_by_channel;

  // Aggregate "overall" funnel (sum across channels)
  const overall = {
    impressions: f.reduce((a, r) => a + r.impressions, 0),
    sessions: f.reduce((a, r) => a + r.sessions, 0),
    engaged_sessions: f.reduce((a, r) => a + r.engaged_sessions, 0),
    qualified_actions: f.reduce((a, r) => a + r.qualified_actions, 0),
    conversions: f.reduce((a, r) => a + r.conversions, 0),
    repeat_customers: f.reduce((a, r) => a + r.repeat_customers, 0),
  };

  const overallStages = [
    {
      label: 'Impressions',
      value: overall.impressions,
      description: 'Total paid impressions delivered',
    },
    {
      label: 'Sessions',
      value: overall.sessions,
      description: 'Visits to the property (paid + organic + referral)',
    },
    {
      label: 'Engaged sessions',
      value: overall.engaged_sessions,
      description: 'Session > 10s and > 1 event',
    },
    {
      label: 'Qualified actions',
      value: overall.qualified_actions,
      description: 'Form submit / demo / cart',
    },
    {
      label: 'Conversions',
      value: overall.conversions,
      description: 'Purchase completed',
    },
    {
      label: 'Repeat customers',
      value: overall.repeat_customers,
      description: 'Two or more conversions',
    },
  ];

  // sort channels by sessions
  const channelsSorted = [...f].sort((a, b) => b.sessions - a.sessions).slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="space-y-2 max-w-3xl">
        <Badge variant="accent" className="w-fit">Funnel Analysis</Badge>
        <h1 className="font-display text-3xl font-medium tracking-tight text-balance">
          Where the funnel leaks, by channel and by stage.
        </h1>
        <p className="text-sm text-muted-foreground">
          Impression → session → engaged session → qualified action → conversion → repeat.
          Built from the joined event stream, not platform-attributed numbers.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall funnel</CardTitle>
            <CardDescription>
              Across all traffic. Each step is a real count from the event data, not a
              hardcoded percentage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={overallStages} />
            <div className="mt-6 grid grid-cols-2 gap-3 text-[11.5px]">
              <Stat
                label="Session → Engaged"
                value={formatPercent(overall.engaged_sessions / Math.max(1, overall.sessions))}
              />
              <Stat
                label="Engaged → QA"
                value={formatPercent(overall.qualified_actions / Math.max(1, overall.engaged_sessions))}
              />
              <Stat
                label="QA → Conversion"
                value={formatPercent(overall.conversions / Math.max(1, overall.qualified_actions))}
              />
              <Stat
                label="Conversion → Repeat"
                value={formatPercent(overall.repeat_customers / Math.max(1, overall.conversions))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Median time at each stage</CardTitle>
            <CardDescription>
              From session start to qualified action — across the highest-volume channels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...channelsSorted]
                .filter((c) => c.median_seconds_session_to_qa > 0)
                .sort((a, b) => a.median_seconds_session_to_qa - b.median_seconds_session_to_qa)
                .map((c) => (
                  <div key={c.channel} className="flex items-center gap-3">
                    <ChannelIcon channel={c.channel} size={20} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium">{CHANNEL_LABELS[c.channel]}</span>
                        <span className="tabular text-muted-foreground">
                          {formatSeconds(c.median_seconds_session_to_qa)}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{
                            width: `${Math.min(
                              100,
                              (c.median_seconds_session_to_qa /
                                Math.max(
                                  ...channelsSorted.map((x) => x.median_seconds_session_to_qa),
                                )) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funnel by channel</CardTitle>
          <CardDescription>
            Small-multiples view. Each tile is one channel's funnel — designed for at-a-glance
            comparison of where each channel breaks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {channelsSorted.map((c) => {
              const stages = [
                {
                  label: 'Sessions',
                  value: c.sessions,
                  description: `${formatNumber(c.sessions)}`,
                },
                {
                  label: 'Engaged',
                  value: c.engaged_sessions,
                  description: `${formatNumber(c.engaged_sessions)}`,
                },
                {
                  label: 'QAs',
                  value: c.qualified_actions,
                  description: `${formatNumber(c.qualified_actions)}`,
                },
                {
                  label: 'Conversions',
                  value: c.conversions,
                  description: `${formatNumber(c.conversions)}`,
                },
                {
                  label: 'Repeat',
                  value: c.repeat_customers,
                  description: `${formatNumber(c.repeat_customers)}`,
                },
              ];
              const conversion = c.sessions > 0 ? c.conversions / c.sessions : 0;
              return (
                <div key={c.channel} className="surface p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={c.channel} size={22} />
                      <span className="font-medium text-[13px]">{CHANNEL_LABELS[c.channel]}</span>
                    </div>
                    <span className="text-[10.5px] tabular text-muted-foreground">
                      {formatPercent(conversion, 2)} sess→conv
                    </span>
                  </div>
                  <FunnelChart stages={stages} variant="compact" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular">{value}</div>
    </div>
  );
}

function formatSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${(s / 60).toFixed(1)}min`;
  return `${(s / 3600).toFixed(1)}h`;
}
