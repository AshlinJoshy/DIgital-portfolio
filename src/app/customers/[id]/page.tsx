import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, Phone, User2, CalendarDays, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChannelIcon } from '@/components/channel-icon';
import { JourneyTimeline } from '@/components/customer/journey-timeline';
import { FeatureImportance } from '@/components/customer/feature-importance';
import {
  getCustomerActivity,
  getCustomerById,
  getJourneys,
  getOfferings,
  getSummary,
} from '@/lib/data';
import { formatDate, formatNumber, formatPercent, formatRelativeTime, formatUSD } from '@/lib/utils';
import { CHANNEL_LABELS } from '@/lib/types';

interface Props {
  params: { id: string };
}

export default function CustomerProfilePage({ params }: Props) {
  const customer = getCustomerById(params.id);
  if (!customer) notFound();

  const activity = getCustomerActivity(params.id);
  const journeys = getJourneys();
  const journey = journeys.find((j) => j.customer_id === params.id);
  const offerings = getOfferings();
  const summary = getSummary();

  // Products viewed (from product_view events)
  const productEvents = activity.events.filter(
    (e) => e.name === 'product_view' && e.url?.startsWith('/product/'),
  );
  const productCounts = new Map<string, number>();
  for (const e of productEvents) {
    const id = e.url!.replace('/product/', '');
    productCounts.set(id, (productCounts.get(id) ?? 0) + 1);
  }
  const topProducts = Array.from(productCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, count]) => ({ offering: offerings.find((o) => o.id === id), count }))
    .filter((p) => p.offering);

  const initials = `${customer.first_name.charAt(0)}${customer.last_name.charAt(0)}`;

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to customers
      </Link>

      {/* Hero */}
      <Card className="border-accent/20 gradient-card overflow-hidden">
        <CardContent className="p-6 sm:p-8 relative">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-start gap-6">
            <Avatar className="h-20 w-20 ring-2 ring-accent/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline">{customer.id}</Badge>
                <StagePill stage={customer.current_stage} />
                {customer.is_referral_partner_sourced && (
                  <Badge variant="accent">referral-sourced · partial attribution</Badge>
                )}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                {customer.first_name} {customer.last_name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> {customer.email}
                </span>
                {customer.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {customer.phone}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" /> First seen {formatDate(customer.created_at)}{' '}
                  ({formatRelativeTime(customer.created_at)})
                </span>
                {customer.account_owner && (
                  <span className="inline-flex items-center gap-1.5">
                    <User2 className="h-3 w-3" /> Owner: {customer.account_owner}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {customer.intent_tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    <Target className="h-2.5 w-2.5 mr-1" /> {t}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-1 sm:w-[200px] gap-2">
              <MetricBlock
                label="Conversion probability"
                value={formatPercent(customer.predicted_conversion_probability)}
                emphasis
              />
              <MetricBlock label="Predicted LTV" value={formatUSD(customer.predicted_ltv_usd)} />
              {customer.converted && customer.conversion_value_usd && (
                <MetricBlock
                  label="Actual conversion"
                  value={formatUSD(customer.conversion_value_usd)}
                />
              )}
              <MetricBlock label="Sessions" value={formatNumber(customer.session_count)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journey overview row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat label="First touch" channel={customer.first_touch_channel} />
        <SummaryStat label="Last touch" channel={customer.last_touch_channel} />
        <SummaryStat
          label="Pageviews"
          value={formatNumber(customer.total_pageviews)}
        />
        <SummaryStat
          label="Engagement events"
          value={formatNumber(customer.total_engagement_events)}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Full journey timeline</CardTitle>
            <CardDescription>
              Every session and every PostHog-style event tied to this customer, in
              chronological order. UTMs, landing pages and engagement signals included.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JourneyTimeline
              sessions={activity.sessions}
              events={activity.events}
              touchpoints={journey?.touchpoints ?? []}
            />
          </CardContent>
        </Card>

        {/* Right rail */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Why this score?</CardTitle>
              <CardDescription>
                Feature contributions from the logistic-regression model.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureImportance customer={customer} weights={summary.scoring_feature_importance} />
            </CardContent>
          </Card>

          {topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Offerings explored</CardTitle>
                <CardDescription>Products this customer viewed.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topProducts.map((p) => (
                    <div
                      key={p.offering!.id}
                      className="flex items-center gap-3 rounded-md border border-border/60 p-2 hover:border-accent/40 transition-colors"
                    >
                      <div className="relative h-10 w-14 rounded overflow-hidden bg-muted shrink-0">
                        <Image
                          src={p.offering!.image_url}
                          alt={p.offering!.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate">{p.offering!.name}</div>
                        <div className="text-[10.5px] text-muted-foreground">
                          {p.offering!.category} · {formatUSD(p.offering!.base_price_usd)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {p.count}×
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Path summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 text-[12px]">
                <Row label="Touchpoints" value={formatNumber(journey?.touchpoints.length ?? 0)} />
                <Row
                  label="Days from first → last"
                  value={`${customer.days_since_first_touch}d`}
                />
                {journey?.time_to_conversion_days != null && (
                  <Row
                    label="Time to conversion"
                    value={`${journey.time_to_conversion_days.toFixed(1)}d`}
                  />
                )}
                <Row label="Engagement events" value={formatNumber(customer.total_engagement_events)} />
                <Row
                  label="QA reached"
                  value={
                    customer.qualified_action_at ? formatDate(customer.qualified_action_at) : '—'
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StagePill({ stage }: { stage: string }) {
  const variants: Record<string, 'secondary' | 'default' | 'accent' | 'success'> = {
    impression: 'secondary',
    session: 'secondary',
    engaged_session: 'default',
    qualified_action: 'accent',
    conversion: 'success',
    repeat_customer: 'success',
  };
  const labels: Record<string, string> = {
    impression: 'Stage · Impression',
    session: 'Stage · Session',
    engaged_session: 'Stage · Engaged',
    qualified_action: 'Stage · Qualified',
    conversion: 'Stage · Converted',
    repeat_customer: 'Stage · Repeat customer',
  };
  return <Badge variant={variants[stage] ?? 'secondary'}>{labels[stage] ?? stage}</Badge>;
}

function MetricBlock({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-md border ${
        emphasis ? 'border-accent/40 bg-accent/5' : 'border-border/60 bg-background'
      } p-2.5`}
    >
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 font-display text-lg tabular ${
          emphasis ? 'text-accent' : 'text-foreground'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  channel,
}: {
  label: string;
  value?: string;
  channel?: 'google' | 'meta' | 'tiktok' | 'linkedin' | 'snapchat' | 'referral' | 'organic' | 'direct' | 'email';
}) {
  return (
    <div className="surface p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {channel ? (
        <div className="mt-1 flex items-center gap-1.5">
          <ChannelIcon channel={channel} size={18} />
          <span className="font-medium text-[13px]">{CHANNEL_LABELS[channel]}</span>
        </div>
      ) : (
        <div className="mt-1 font-medium text-[14px] tabular">{value}</div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular">{value}</span>
    </div>
  );
}
