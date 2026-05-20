/**
 * Build-time mock data generator for the Marketing Intelligence dashboard.
 *
 * Produces a coherent dataset (~6 months of activity) representing what
 * a multi-channel consumer brand would actually see across:
 *   Google Ads, Meta Ads, TikTok Ads, LinkedIn Ads, Snapchat,
 *   PostHog, GA4, and an internal CRM.
 *
 * Storyline encoded in the distributions:
 *   - Meta = volume driver, mid-quality customers
 *   - Google Search = high intent, best CPA
 *   - TikTok = cheap top-of-funnel, low conversion rate
 *   - LinkedIn = small volume, high AOV
 *   - Referral partners = high volume, partial attribution
 *
 * Output: /data/dataset.json — consumed by the app at request time.
 */

import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import type {
  AdSpendRow,
  AnalyticsEvent,
  AttributionWeights,
  Channel,
  ChannelMetrics,
  Conversion,
  Creative,
  Customer,
  CustomerJourney,
  DailyTimeseries,
  DataBundle,
  EventName,
  FunnelByChannelRow,
  IntentTag,
  KpiSummary,
  Offering,
  Session,
  Touchpoint,
} from '../src/lib/types';
import { CHANNELS, PAID_CHANNELS } from '../src/lib/types';
import {
  computeBaselineAttributions,
  computeMarkovAttribution,
} from '../src/lib/algorithms/markov';
import {
  scoreCustomer,
  trainLogisticRegression,
} from '../src/lib/algorithms/logistic-regression';

// Seeded so builds are reproducible
faker.seed(20260101);
const rand = mulberry32(20260101);

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function weightedPick<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((a, b) => a + b.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function gaussian(mean: number, std: number): number {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoDateTime(d: Date): string {
  return d.toISOString();
}

// ─────────────────────────────────────────────────────────────────────────
// CHANNEL STORYLINE PARAMETERS
// ─────────────────────────────────────────────────────────────────────────
interface ChannelProfile {
  share_of_paid_spend: number;
  daily_spend_mean: number;
  daily_spend_std: number;
  cpc_mean: number;
  cpc_std: number;
  conversion_rate_mean: number; // session → conversion baseline
  qualified_action_rate: number;
  aov_multiplier: number;
  engagement_propensity: number; // 0-1
  num_campaigns: number;
}

const CHANNEL_PROFILES: Record<Channel, ChannelProfile> = {
  google: {
    share_of_paid_spend: 0.32,
    daily_spend_mean: 2400,
    daily_spend_std: 600,
    cpc_mean: 2.4,
    cpc_std: 0.4,
    conversion_rate_mean: 0.055,
    qualified_action_rate: 0.18,
    aov_multiplier: 1.0,
    engagement_propensity: 0.62,
    num_campaigns: 8,
  },
  meta: {
    share_of_paid_spend: 0.38,
    daily_spend_mean: 2800,
    daily_spend_std: 750,
    cpc_mean: 1.4,
    cpc_std: 0.3,
    conversion_rate_mean: 0.022,
    qualified_action_rate: 0.09,
    aov_multiplier: 0.92,
    engagement_propensity: 0.55,
    num_campaigns: 10,
  },
  tiktok: {
    share_of_paid_spend: 0.14,
    daily_spend_mean: 1050,
    daily_spend_std: 280,
    cpc_mean: 0.85,
    cpc_std: 0.18,
    conversion_rate_mean: 0.008,
    qualified_action_rate: 0.04,
    aov_multiplier: 0.78,
    engagement_propensity: 0.42,
    num_campaigns: 6,
  },
  linkedin: {
    share_of_paid_spend: 0.09,
    daily_spend_mean: 700,
    daily_spend_std: 200,
    cpc_mean: 6.2,
    cpc_std: 1.2,
    conversion_rate_mean: 0.038,
    qualified_action_rate: 0.16,
    aov_multiplier: 1.85,
    engagement_propensity: 0.7,
    num_campaigns: 4,
  },
  snapchat: {
    share_of_paid_spend: 0.07,
    daily_spend_mean: 530,
    daily_spend_std: 160,
    cpc_mean: 1.1,
    cpc_std: 0.22,
    conversion_rate_mean: 0.012,
    qualified_action_rate: 0.05,
    aov_multiplier: 0.85,
    engagement_propensity: 0.45,
    num_campaigns: 4,
  },
  referral: {
    share_of_paid_spend: 0,
    daily_spend_mean: 0,
    daily_spend_std: 0,
    cpc_mean: 0,
    cpc_std: 0,
    conversion_rate_mean: 0.07,
    qualified_action_rate: 0.22,
    aov_multiplier: 1.25,
    engagement_propensity: 0.6,
    num_campaigns: 0,
  },
  organic: {
    share_of_paid_spend: 0,
    daily_spend_mean: 0,
    daily_spend_std: 0,
    cpc_mean: 0,
    cpc_std: 0,
    conversion_rate_mean: 0.045,
    qualified_action_rate: 0.15,
    aov_multiplier: 1.05,
    engagement_propensity: 0.6,
    num_campaigns: 0,
  },
  direct: {
    share_of_paid_spend: 0,
    daily_spend_mean: 0,
    daily_spend_std: 0,
    cpc_mean: 0,
    cpc_std: 0,
    conversion_rate_mean: 0.06,
    qualified_action_rate: 0.18,
    aov_multiplier: 1.1,
    engagement_propensity: 0.65,
    num_campaigns: 0,
  },
  email: {
    share_of_paid_spend: 0,
    daily_spend_mean: 0,
    daily_spend_std: 0,
    cpc_mean: 0,
    cpc_std: 0,
    conversion_rate_mean: 0.08,
    qualified_action_rate: 0.2,
    aov_multiplier: 1.0,
    engagement_propensity: 0.7,
    num_campaigns: 0,
  },
};

const INTENT_TAGS: IntentTag[] = [
  'price-sensitive',
  'feature-focused',
  'comparison-shopping',
  'ready-to-buy',
  'researching',
  'returning-evaluator',
  'social-proof-seeker',
];

// ─────────────────────────────────────────────────────────────────────────
// DATE RANGE
// ─────────────────────────────────────────────────────────────────────────
const TODAY = new Date('2026-05-20T00:00:00Z');
const DAYS = 180;
const START_DATE = new Date(TODAY.getTime() - DAYS * 24 * 60 * 60 * 1000);

const dateRange: Date[] = [];
for (let i = 0; i < DAYS; i++) {
  const d = new Date(START_DATE.getTime() + i * 24 * 60 * 60 * 1000);
  dateRange.push(d);
}

function seasonalMultiplier(date: Date): number {
  // Mild weekly seasonality + growth trend
  const dayOfWeek = date.getUTCDay();
  const weekend = dayOfWeek === 0 || dayOfWeek === 6 ? 0.85 : 1.0;
  const dayIndex = Math.floor((date.getTime() - START_DATE.getTime()) / (24 * 60 * 60 * 1000));
  const growth = 1 + 0.0015 * dayIndex; // 1.27x by end
  const monthly = 1 + 0.08 * Math.sin((2 * Math.PI * dayIndex) / 30);
  return weekend * growth * monthly;
}

// ─────────────────────────────────────────────────────────────────────────
// OFFERINGS / SKUs
// ─────────────────────────────────────────────────────────────────────────
const OFFERING_CATEGORIES = [
  'Signature Collection',
  'Essentials',
  'Premium Tier',
  'Limited Edition',
  'Seasonal',
  'Bundles',
];

function generateOfferings(count: number): Offering[] {
  const out: Offering[] = [];
  for (let i = 0; i < count; i++) {
    const category = OFFERING_CATEGORIES[i % OFFERING_CATEGORIES.length];
    out.push({
      id: `sku_${(i + 1).toString().padStart(4, '0')}`,
      name: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      category,
      base_price_usd: Math.round(200 + rand() * 4800),
      image_url: `https://picsum.photos/seed/sku${i}/240/180`,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// CREATIVES
// ─────────────────────────────────────────────────────────────────────────
const HOOKS: Record<Channel, string[]> = {
  meta: [
    'The detail that changes everything',
    'You shouldn\'t have to choose between style and substance',
    'Why pay more for the same thing?',
    'Designed for the way you actually live',
    'Three reasons our customers come back',
  ],
  google: [
    'Compare and decide in under 3 minutes',
    'Built for people who do their homework',
    'See exactly what you\'re getting',
    'No long-term commitment required',
    'Trusted by thousands — see the reviews',
  ],
  tiktok: [
    'POV: you found the one',
    'TikTok made me buy it',
    'Things I wish I bought sooner',
    'This is your sign',
    'Hot take: this changed my routine',
  ],
  linkedin: [
    'How leading teams approach this',
    'The professional\'s alternative',
    'ROI in 90 days or less',
    'Built for serious operators',
    'A smarter way to think about value',
  ],
  snapchat: [
    'Limited drop — link in story',
    'Today only',
    'New arrival',
    'For the weekend',
    'Trending now',
  ],
  referral: [],
  organic: [],
  direct: [],
  email: [],
};

const INTENT_BY_HOOK_KEYWORDS: { keywords: string[]; tags: IntentTag[] }[] = [
  { keywords: ['pay', 'price', 'value', 'roi'], tags: ['price-sensitive'] },
  { keywords: ['compare', 'see', 'alternative'], tags: ['comparison-shopping'] },
  { keywords: ['features', 'built', 'designed'], tags: ['feature-focused'] },
  { keywords: ['limited', 'today', 'now'], tags: ['ready-to-buy'] },
  { keywords: ['reviews', 'trusted', 'customers'], tags: ['social-proof-seeker'] },
];

function inferIntentTags(hook: string): IntentTag[] {
  const lower = hook.toLowerCase();
  const tags = new Set<IntentTag>();
  for (const { keywords, tags: t } of INTENT_BY_HOOK_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) t.forEach((tag) => tags.add(tag));
  }
  if (tags.size === 0) tags.add('researching');
  return Array.from(tags);
}

function generateCreatives(): Creative[] {
  const out: Creative[] = [];
  let i = 1;
  for (const channel of PAID_CHANNELS) {
    const profile = CHANNEL_PROFILES[channel];
    const numCreatives = profile.num_campaigns * 3;
    for (let k = 0; k < numCreatives; k++) {
      const hooks = HOOKS[channel] ?? [];
      const hook = hooks.length ? hooks[k % hooks.length] : faker.company.catchPhrase();
      out.push({
        id: `cr_${channel}_${i.toString().padStart(4, '0')}`,
        channel,
        name: `${channel.toUpperCase()} • ${faker.commerce.productAdjective()} ${k + 1}`,
        format: pick(['video', 'image', 'carousel', channel === 'google' ? 'text' : 'image']),
        thumbnail_url: `https://picsum.photos/seed/${channel}${k}/320/200`,
        hook_text: hook,
        ctas: [pick(['Learn More', 'Shop Now', 'See Pricing', 'Book Demo', 'Get Started'])],
        intent_themes: inferIntentTags(hook),
      });
      i++;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// AD SPEND
// ─────────────────────────────────────────────────────────────────────────
function generateAdSpend(creatives: Creative[]): AdSpendRow[] {
  const rows: AdSpendRow[] = [];
  // campaign / adgroup names per channel
  const campaignsByChannel: Record<Channel, { id: string; name: string; adGroups: { id: string; name: string }[] }[]> =
    {} as never;

  for (const channel of PAID_CHANNELS) {
    const profile = CHANNEL_PROFILES[channel];
    const campaigns: { id: string; name: string; adGroups: { id: string; name: string }[] }[] = [];
    for (let c = 0; c < profile.num_campaigns; c++) {
      const cId = `cmp_${channel}_${(c + 1).toString().padStart(3, '0')}`;
      const themes = [
        'Prospecting',
        'Retargeting',
        'Brand',
        'Conquesting',
        'Lookalike',
        'Interest',
        'Seasonal',
        'High-Intent',
      ];
      const cName = `${channel.toUpperCase()} ${themes[c % themes.length]} ${c + 1}`;
      const adGroups: { id: string; name: string }[] = [];
      const numGroups = 2 + Math.floor(rand() * 3);
      for (let g = 0; g < numGroups; g++) {
        adGroups.push({
          id: `${cId}_ag_${g + 1}`,
          name: `${cName} / AG ${g + 1}`,
        });
      }
      campaigns.push({ id: cId, name: cName, adGroups });
    }
    campaignsByChannel[channel] = campaigns;
  }

  for (const date of dateRange) {
    const dateStr = isoDate(date);
    const season = seasonalMultiplier(date);
    for (const channel of PAID_CHANNELS) {
      const profile = CHANNEL_PROFILES[channel];
      const campaigns = campaignsByChannel[channel];
      const channelCreatives = creatives.filter((c) => c.channel === channel);
      const dailyChannelSpend = Math.max(
        50,
        gaussian(profile.daily_spend_mean, profile.daily_spend_std) * season,
      );

      // Distribute across campaigns with skew (Pareto-like)
      const campaignWeights = campaigns.map((_, idx) => 1 / (idx + 1) ** 0.7);
      const wSum = campaignWeights.reduce((a, b) => a + b, 0);
      const campaignSpends = campaignWeights.map((w) => (w / wSum) * dailyChannelSpend);

      campaigns.forEach((cmp, cmpIdx) => {
        const cmpSpend = campaignSpends[cmpIdx];
        cmp.adGroups.forEach((ag, agIdx) => {
          const agSpend = cmpSpend / cmp.adGroups.length;
          const creative = channelCreatives[(cmpIdx * 3 + agIdx) % channelCreatives.length];
          const cpc = clamp(gaussian(profile.cpc_mean, profile.cpc_std), 0.2, 50);
          const clicks = Math.max(1, Math.round(agSpend / cpc));
          // CTR roughly 0.8–3% depending on channel
          const ctr = clamp(gaussian(channel === 'tiktok' ? 0.018 : 0.012, 0.004), 0.003, 0.05);
          const impressions = Math.round(clicks / ctr);
          // platform-attributed conversions: noisier than real conversions
          const platConv = clicks * clamp(gaussian(profile.conversion_rate_mean * 1.4, 0.01), 0, 0.2);
          rows.push({
            date: dateStr,
            channel,
            campaign_id: cmp.id,
            campaign_name: cmp.name,
            ad_group_id: ag.id,
            ad_group_name: ag.name,
            creative_id: creative.id,
            creative_name: creative.name,
            impressions,
            clicks,
            spend_usd: Math.round(agSpend * 100) / 100,
            platform_conversions: Math.round(platConv),
          });
        });
      });
    }
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────
// SESSIONS, EVENTS, CUSTOMERS — joint generation to keep coherence
// ─────────────────────────────────────────────────────────────────────────
const FIRST_NAMES = Array.from({ length: 200 }, () => faker.person.firstName());
const LAST_NAMES = Array.from({ length: 200 }, () => faker.person.lastName());
const ACCOUNT_OWNERS = Array.from({ length: 12 }, () => faker.person.fullName());

const LANDING_PAGES = [
  '/',
  '/collections/signature',
  '/collections/essentials',
  '/pricing',
  '/about',
  '/contact',
  '/lp/premium-experience',
  '/lp/limited-edition',
  '/lp/save-20',
  '/lp/comparison',
  '/blog/buyers-guide',
  '/blog/how-it-works',
];

const PRODUCT_PAGES = (skuIds: string[]) =>
  skuIds.map((id) => `/product/${id}`);

const EVENT_NAMES: EventName[] = [
  'pageview',
  'product_view',
  'product_details_expanded',
  'video_watched',
  'pricing_viewed',
  'comparison_used',
  'chat_opened',
  'whatsapp_clicked',
  'phone_clicked',
  'form_submitted',
  'qualified_action_completed',
  'purchase_completed',
];

interface BuildState {
  sessions: Session[];
  events: AnalyticsEvent[];
  customers: Customer[];
  conversions: Conversion[];
  touchpoints: Map<string, Touchpoint[]>;
}

function newState(): BuildState {
  return {
    sessions: [],
    events: [],
    customers: [],
    conversions: [],
    touchpoints: new Map(),
  };
}

function generateSessionsAndCustomers(adSpend: AdSpendRow[], offerings: Offering[]) {
  const state = newState();
  const skuIds = offerings.map((o) => o.id);
  const productPages = PRODUCT_PAGES(skuIds);
  // Channel volume distribution for sessions
  // The user spec says ~50,000 sessions, ~5,000 customers, ~2,000 QA, ~500 conversions
  const TARGET_SESSIONS = 50000;

  // Compute share of paid traffic from spend, blend with organic/direct/referral
  const channelSessionShare: Record<Channel, number> = {
    google: 0.21,
    meta: 0.3,
    tiktok: 0.16,
    linkedin: 0.04,
    snapchat: 0.05,
    referral: 0.1,
    organic: 0.09,
    direct: 0.05,
    email: 0,
  };

  // Build a map: channel → list of (date, campaign_id) tuples to bind sessions to ad activity
  const adIndexByChannel: Record<Channel, AdSpendRow[]> = {} as never;
  for (const c of PAID_CHANNELS) adIndexByChannel[c] = adSpend.filter((r) => r.channel === c);

  // Pre-generate a customer pool of ~5,000 with anonymous → identified events
  const TARGET_CUSTOMERS = 5000;
  const customers: Customer[] = [];
  for (let i = 0; i < TARGET_CUSTOMERS; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const id = `cus_${(i + 1).toString().padStart(5, '0')}`;
    customers.push({
      id,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
      phone: rand() > 0.3 ? faker.phone.number() : undefined,
      first_name: first,
      last_name: last,
      created_at: '',
      first_touch_channel: 'direct',
      last_touch_channel: 'direct',
      current_stage: 'session',
      account_owner: undefined,
      session_count: 0,
      total_pageviews: 0,
      total_engagement_events: 0,
      days_since_first_touch: 0,
      predicted_conversion_probability: 0,
      predicted_ltv_usd: 0,
      intent_tags: [],
      converted: false,
      conversion_value_usd: undefined,
      qualified_action_at: undefined,
      conversion_at: undefined,
      is_referral_partner_sourced: false,
    });
  }

  let sessionIdx = 0;
  const customerByAnonymous = new Map<string, string>();

  // Sessions get distributed over the date range proportional to seasonal multiplier
  const dailyWeights = dateRange.map((d) => seasonalMultiplier(d));
  const wTotal = dailyWeights.reduce((a, b) => a + b, 0);

  // Channels with first-touch probability for un-identified vs identified
  const allChannels = (Object.keys(channelSessionShare) as Channel[]).filter(
    (c) => channelSessionShare[c] > 0,
  );

  let qualifiedActionsCount = 0;
  let conversionsCount = 0;
  const TARGET_QA = 2000;
  const TARGET_CONV = 500;

  // Probability per channel that a session will lead to (a) qualified action, (b) conversion
  // calibrated so that target totals are roughly hit
  const qaRate: Record<Channel, number> = {
    google: 0.065,
    meta: 0.03,
    tiktok: 0.011,
    linkedin: 0.07,
    snapchat: 0.015,
    referral: 0.075,
    organic: 0.06,
    direct: 0.06,
    email: 0.08,
  };

  const convGivenQa: Record<Channel, number> = {
    google: 0.36,
    meta: 0.21,
    tiktok: 0.12,
    linkedin: 0.42,
    snapchat: 0.17,
    referral: 0.36,
    organic: 0.32,
    direct: 0.34,
    email: 0.4,
  };

  const aovByChannel: Record<Channel, number> = {
    google: 1850,
    meta: 1500,
    tiktok: 1100,
    linkedin: 3200,
    snapchat: 1300,
    referral: 2200,
    organic: 1900,
    direct: 1950,
    email: 1750,
  };

  for (let s = 0; s < TARGET_SESSIONS; s++) {
    // pick day weighted
    let r = rand() * wTotal;
    let dayIdx = 0;
    while (r > 0 && dayIdx < dateRange.length) {
      r -= dailyWeights[dayIdx];
      if (r <= 0) break;
      dayIdx++;
    }
    dayIdx = Math.min(dayIdx, dateRange.length - 1);
    const dateBase = dateRange[dayIdx];

    // Channel
    const channelChoices: { value: Channel; weight: number }[] = allChannels.map((c) => ({
      value: c,
      weight: channelSessionShare[c],
    }));
    const channel = weightedPick(channelChoices);

    // ~10% organic/direct sessions are un-attributable — done by definition of the channel
    // Identified customer? About 5000 / 50000 = 10% of sessions belong to identified customers
    const identified = rand() < 0.13;
    const anonId = identified ? `anon_known_${Math.floor(rand() * customers.length)}` : `anon_${s}`;
    let customerId: string | undefined = undefined;

    if (identified) {
      const existing = customerByAnonymous.get(anonId);
      if (existing) {
        customerId = existing;
      } else {
        // assign a brand-new customer to this anonymous id
        const idx = customers.findIndex((c) => c.created_at === '');
        if (idx >= 0) {
          customerByAnonymous.set(anonId, customers[idx].id);
          customers[idx].created_at = isoDateTime(dateBase);
          customers[idx].first_touch_channel = channel;
          customerId = customers[idx].id;
          if (channel === 'referral') customers[idx].is_referral_partner_sourced = true;
        }
      }
    }

    const sessionStart = new Date(
      dateBase.getTime() + Math.floor(rand() * 24 * 60 * 60 * 1000),
    );

    const profile = CHANNEL_PROFILES[channel];
    const engaged = rand() < profile.engagement_propensity;
    const pageCount = engaged ? 2 + Math.floor(rand() * 8) : 1 + Math.floor(rand() * 2);
    const sessionDurationSec = engaged
      ? 30 + Math.floor(rand() * 600)
      : 5 + Math.floor(rand() * 30);
    const sessionEnd = new Date(sessionStart.getTime() + sessionDurationSec * 1000);

    let utm_source: string | undefined,
      utm_medium: string | undefined,
      utm_campaign: string | undefined,
      utm_content: string | undefined,
      campaign_id: string | undefined;

    if (PAID_CHANNELS.includes(channel)) {
      const candidates = adIndexByChannel[channel].filter((r) => r.date === isoDate(dateBase));
      const adRow = candidates.length
        ? candidates[Math.floor(rand() * candidates.length)]
        : adIndexByChannel[channel][Math.floor(rand() * adIndexByChannel[channel].length)];
      if (adRow) {
        utm_source = channel;
        utm_medium = channel === 'google' ? 'cpc' : 'paid_social';
        utm_campaign = adRow.campaign_id;
        utm_content = adRow.creative_id;
        campaign_id = adRow.campaign_id;
      }
    } else if (channel === 'referral') {
      const partners = ['partner_aurora', 'partner_basecamp', 'partner_meridian', 'partner_north'];
      utm_source = pick(partners);
      utm_medium = 'referral';
    } else if (channel === 'organic') {
      utm_source = 'google';
      utm_medium = 'organic';
    } else if (channel === 'email') {
      utm_source = 'crm';
      utm_medium = 'email';
    }

    const landing = pick([...LANDING_PAGES, ...productPages]);

    // Qualified action?
    const qualified = rand() < qaRate[channel] * (engaged ? 1.2 : 0.4);
    let converted = false;
    if (qualified) {
      qualifiedActionsCount++;
      converted = rand() < convGivenQa[channel];
      if (converted) conversionsCount++;
    }

    const sessionId = `ses_${(sessionIdx + 1).toString().padStart(6, '0')}`;
    sessionIdx++;

    const session: Session = {
      id: sessionId,
      customer_id: customerId,
      anonymous_id: anonId,
      started_at: isoDateTime(sessionStart),
      ended_at: isoDateTime(sessionEnd),
      device: weightedPick([
        { value: 'mobile', weight: 0.62 },
        { value: 'desktop', weight: 0.31 },
        { value: 'tablet', weight: 0.07 },
      ]),
      channel,
      campaign_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      landing_page: landing,
      referrer: PAID_CHANNELS.includes(channel) ? `https://${channel}.com/` : undefined,
      page_count: pageCount,
      events_count: 0,
      engaged,
      qualified_action: qualified,
      converted,
    };

    // Events for this session
    const events: AnalyticsEvent[] = [];
    let t = sessionStart.getTime();
    const eventStep = sessionDurationSec * 1000 / Math.max(1, pageCount + 2);

    // pageview events
    for (let p = 0; p < pageCount; p++) {
      events.push({
        id: `evt_${sessionId}_${events.length}`,
        session_id: sessionId,
        customer_id: customerId,
        timestamp: new Date(t).toISOString(),
        name: 'pageview',
        url: p === 0 ? landing : pick([...LANDING_PAGES, ...productPages]),
      });
      t += eventStep;
    }

    // engagement events probabilistic
    const engagementEventCount = engaged ? 1 + Math.floor(rand() * 4) : 0;
    for (let e = 0; e < engagementEventCount; e++) {
      const ev: EventName = weightedPick([
        { value: 'product_view', weight: 5 },
        { value: 'product_details_expanded', weight: 2 },
        { value: 'video_watched', weight: 2 },
        { value: 'pricing_viewed', weight: 3 },
        { value: 'comparison_used', weight: 1.5 },
        { value: 'chat_opened', weight: 0.6 },
        { value: 'whatsapp_clicked', weight: 0.5 },
        { value: 'phone_clicked', weight: 0.4 },
      ]);
      events.push({
        id: `evt_${sessionId}_${events.length}`,
        session_id: sessionId,
        customer_id: customerId,
        timestamp: new Date(t).toISOString(),
        name: ev,
        url: ev.includes('product') ? pick(productPages) : undefined,
      });
      t += eventStep;
    }

    if (qualified) {
      events.push({
        id: `evt_${sessionId}_${events.length}`,
        session_id: sessionId,
        customer_id: customerId,
        timestamp: new Date(t).toISOString(),
        name: 'form_submitted',
      });
      t += 1000;
      events.push({
        id: `evt_${sessionId}_${events.length}`,
        session_id: sessionId,
        customer_id: customerId,
        timestamp: new Date(t).toISOString(),
        name: 'qualified_action_completed',
      });
    }

    if (converted) {
      // Conversion may happen days later but for simplicity place it within the same flow
      const convTs = new Date(t + 60_000 + Math.floor(rand() * 5 * 86400 * 1000));
      events.push({
        id: `evt_${sessionId}_${events.length}`,
        session_id: sessionId,
        customer_id: customerId,
        timestamp: convTs.toISOString(),
        name: 'purchase_completed',
      });

      // Create conversion record (need a customer_id)
      let convCustomerId = customerId;
      if (!convCustomerId) {
        const idx = customers.findIndex((c) => c.created_at === '');
        if (idx >= 0) {
          customers[idx].created_at = isoDateTime(sessionStart);
          customers[idx].first_touch_channel = channel;
          convCustomerId = customers[idx].id;
          customerByAnonymous.set(anonId, convCustomerId);
        }
      }

      if (convCustomerId) {
        const value = Math.max(
          200,
          gaussian(aovByChannel[channel], aovByChannel[channel] * 0.3),
        );
        state.conversions.push({
          id: `conv_${state.conversions.length + 1}`,
          customer_id: convCustomerId,
          occurred_at: convTs.toISOString(),
          value_usd: Math.round(value * 100) / 100,
          sku_id: pick(skuIds),
          attribution_channel: channel,
        });
        const cust = customers.find((c) => c.id === convCustomerId);
        if (cust) {
          cust.converted = true;
          cust.conversion_value_usd = Math.round(value * 100) / 100;
          cust.conversion_at = convTs.toISOString();
          cust.qualified_action_at = cust.qualified_action_at ?? events[events.length - 2]?.timestamp;
          cust.last_touch_channel = channel;
          cust.current_stage = 'conversion';
        }
        // If this is a lazy-create flow (customer wasn't bound at session start),
        // bind their session retroactively and record the touchpoint
        if (!customerId) {
          customerId = convCustomerId;
          session.customer_id = convCustomerId;
          for (const e of events) e.customer_id = convCustomerId;
          const list = state.touchpoints.get(convCustomerId) ?? [];
          list.push({
            customer_id: convCustomerId,
            position: list.length + 1,
            channel,
            campaign_id,
            timestamp: isoDateTime(sessionStart),
            session_id: sessionId,
          });
          state.touchpoints.set(convCustomerId, list);
        }
      }
    } else if (qualified && customerId) {
      const cust = customers.find((c) => c.id === customerId);
      if (cust) {
        cust.qualified_action_at = cust.qualified_action_at ?? events[events.length - 1]?.timestamp;
        cust.last_touch_channel = channel;
        if (cust.current_stage === 'session' || cust.current_stage === 'engaged_session') {
          cust.current_stage = 'qualified_action';
        }
      }
    } else if (customerId) {
      const cust = customers.find((c) => c.id === customerId);
      if (cust) {
        cust.last_touch_channel = channel;
        if (engaged && cust.current_stage === 'session') cust.current_stage = 'engaged_session';
      }
    }

    session.events_count = events.length;
    state.sessions.push(session);
    state.events.push(...events);

    // record touchpoint if this is a known customer (and not already recorded by the lazy-create branch)
    if (customerId) {
      const list = state.touchpoints.get(customerId) ?? [];
      const alreadyRecorded = list.some((t) => t.session_id === sessionId);
      if (!alreadyRecorded) {
        list.push({
          customer_id: customerId,
          position: list.length + 1,
          channel,
          campaign_id,
          timestamp: isoDateTime(sessionStart),
          session_id: sessionId,
        });
        state.touchpoints.set(customerId, list);
      }
    }
  }

  // Drop customers that never had a session
  state.customers = customers.filter((c) => c.created_at !== '');

  // Enrich customer aggregates
  for (const cust of state.customers) {
    const journey = state.touchpoints.get(cust.id) ?? [];
    cust.session_count = journey.length;
    cust.total_pageviews = state.events.filter(
      (e) => e.customer_id === cust.id && e.name === 'pageview',
    ).length;
    cust.total_engagement_events = state.events.filter(
      (e) =>
        e.customer_id === cust.id &&
        [
          'product_view',
          'product_details_expanded',
          'video_watched',
          'pricing_viewed',
          'comparison_used',
          'chat_opened',
          'whatsapp_clicked',
          'phone_clicked',
        ].includes(e.name),
    ).length;
    const first = new Date(cust.created_at).getTime();
    cust.days_since_first_touch = Math.max(
      0,
      Math.floor((TODAY.getTime() - first) / (24 * 60 * 60 * 1000)),
    );
    // Intent tags from a probabilistic mix
    const intents = new Set<IntentTag>();
    const numTags = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < numTags; k++) {
      intents.add(pick(INTENT_TAGS));
    }
    if (cust.converted) intents.add('ready-to-buy');
    if (cust.total_engagement_events > 5) intents.add('feature-focused');
    if (cust.is_referral_partner_sourced) intents.add('social-proof-seeker');
    cust.intent_tags = Array.from(intents);
    if (cust.converted && rand() < 0.5) cust.account_owner = pick(ACCOUNT_OWNERS);
  }

  return state;
}

// ─────────────────────────────────────────────────────────────────────────
// JOURNEYS
// ─────────────────────────────────────────────────────────────────────────
function buildJourneys(state: BuildState): CustomerJourney[] {
  const out: CustomerJourney[] = [];
  for (const cust of state.customers) {
    const tps = (state.touchpoints.get(cust.id) ?? []).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    if (tps.length === 0) continue;
    let time_to_conversion_days: number | undefined;
    if (cust.converted && cust.conversion_at) {
      const first = new Date(tps[0].timestamp).getTime();
      const conv = new Date(cust.conversion_at).getTime();
      time_to_conversion_days = Math.max(0, (conv - first) / (1000 * 60 * 60 * 24));
    }
    out.push({
      customer_id: cust.id,
      touchpoints: tps,
      converted: cust.converted,
      conversion_value_usd: cust.conversion_value_usd,
      time_to_conversion_days,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// AGGREGATES / METRICS
// ─────────────────────────────────────────────────────────────────────────
function buildChannelMetrics(
  adSpend: AdSpendRow[],
  sessions: Session[],
  customers: Customer[],
  conversions: Conversion[],
): ChannelMetrics[] {
  const channelSet = new Set<Channel>(CHANNELS);
  const totalSpend = adSpend.reduce((a, r) => a + r.spend_usd, 0);

  const out: ChannelMetrics[] = [];
  for (const channel of channelSet) {
    const spendRows = adSpend.filter((r) => r.channel === channel);
    const spend = spendRows.reduce((a, r) => a + r.spend_usd, 0);
    const impressions = spendRows.reduce((a, r) => a + r.impressions, 0);
    const clicks = spendRows.reduce((a, r) => a + r.clicks, 0);
    const channelSessions = sessions.filter((s) => s.channel === channel);
    const sessionCount = channelSessions.length;
    const qa = channelSessions.filter((s) => s.qualified_action).length;
    const channelConv = conversions.filter((c) => c.attribution_channel === channel);
    const convCount = channelConv.length;
    const convValue = channelConv.reduce((a, c) => a + c.value_usd, 0);
    out.push({
      channel,
      spend_usd: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      sessions: sessionCount,
      qualified_actions: qa,
      conversions: convCount,
      conversion_value_usd: Math.round(convValue * 100) / 100,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpl: qa > 0 ? spend / qa : 0,
      cpqa: qa > 0 ? spend / qa : 0,
      cpa: convCount > 0 ? spend / convCount : 0,
      ctr: impressions > 0 ? clicks / impressions : 0,
      conversion_rate: sessionCount > 0 ? convCount / sessionCount : 0,
      share_of_spend: totalSpend > 0 ? spend / totalSpend : 0,
      roas: spend > 0 ? convValue / spend : 0,
    });
  }
  // Sort: highest spend first, with channels of 0 spend sorted by sessions
  out.sort((a, b) => {
    if (a.spend_usd !== b.spend_usd) return b.spend_usd - a.spend_usd;
    return b.sessions - a.sessions;
  });
  return out;
}

function buildDailyTimeseries(
  adSpend: AdSpendRow[],
  sessions: Session[],
  customers: Customer[],
  conversions: Conversion[],
): DailyTimeseries[] {
  const map = new Map<string, DailyTimeseries>();
  const ensure = (d: string): DailyTimeseries => {
    if (!map.has(d))
      map.set(d, {
        date: d,
        spend_usd: 0,
        sessions: 0,
        qualified_actions: 0,
        conversions: 0,
        conversion_value_usd: 0,
        customers_acquired: 0,
      });
    return map.get(d)!;
  };
  for (const r of adSpend) ensure(r.date).spend_usd += r.spend_usd;
  for (const s of sessions) {
    const d = s.started_at.slice(0, 10);
    const row = ensure(d);
    row.sessions++;
    if (s.qualified_action) row.qualified_actions++;
  }
  for (const c of conversions) {
    const d = c.occurred_at.slice(0, 10);
    const row = ensure(d);
    row.conversions++;
    row.conversion_value_usd += c.value_usd;
  }
  for (const cust of customers) {
    const d = cust.created_at.slice(0, 10);
    if (!d) continue;
    ensure(d).customers_acquired++;
  }
  return Array.from(map.values())
    .map((r) => ({
      ...r,
      spend_usd: Math.round(r.spend_usd * 100) / 100,
      conversion_value_usd: Math.round(r.conversion_value_usd * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildKpiSummary(metrics: ChannelMetrics[], conversions: Conversion[], customers: Customer[]): KpiSummary {
  const total_spend_usd = metrics.reduce((a, m) => a + m.spend_usd, 0);
  const conversions_count = conversions.length;
  const conversion_value_usd = conversions.reduce((a, c) => a + c.value_usd, 0);
  const qualified_actions = customers.filter((c) => c.qualified_action_at).length;
  const customers_acquired = customers.length;
  return {
    total_spend_usd: Math.round(total_spend_usd * 100) / 100,
    customers_acquired,
    qualified_actions,
    conversions: conversions_count,
    conversion_value_usd: Math.round(conversion_value_usd * 100) / 100,
    true_cost_per_conversion: conversions_count > 0 ? total_spend_usd / conversions_count : 0,
    pipeline_value_usd:
      Math.round(
        customers
          .filter((c) => !c.converted)
          .reduce((a, c) => a + c.predicted_ltv_usd * c.predicted_conversion_probability, 0) * 100,
      ) / 100,
    blended_roas: total_spend_usd > 0 ? conversion_value_usd / total_spend_usd : 0,
  };
}

function buildFunnelByChannel(
  adSpend: AdSpendRow[],
  sessions: Session[],
  customers: Customer[],
  conversions: Conversion[],
): FunnelByChannelRow[] {
  const channelSet = new Set<Channel>(CHANNELS);
  const out: FunnelByChannelRow[] = [];
  const repeatCustomersByChannel: Record<Channel, number> = {} as never;
  for (const c of channelSet) repeatCustomersByChannel[c] = 0;
  const conversionCountByCustomer = new Map<string, number>();
  for (const c of conversions) conversionCountByCustomer.set(c.customer_id, (conversionCountByCustomer.get(c.customer_id) ?? 0) + 1);
  for (const cust of customers) {
    if ((conversionCountByCustomer.get(cust.id) ?? 0) >= 2) {
      repeatCustomersByChannel[cust.first_touch_channel]++;
    }
  }

  for (const channel of channelSet) {
    const spendRows = adSpend.filter((r) => r.channel === channel);
    const impressions = spendRows.reduce((a, r) => a + r.impressions, 0);
    const channelSessions = sessions.filter((s) => s.channel === channel);
    const sCount = channelSessions.length;
    const eCount = channelSessions.filter((s) => s.engaged).length;
    const qaCount = channelSessions.filter((s) => s.qualified_action).length;
    const convCount = channelSessions.filter((s) => s.converted).length;

    // median seconds from session start to QA
    const qaSessions = channelSessions.filter((s) => s.qualified_action);
    let median = 0;
    if (qaSessions.length > 0) {
      const durs = qaSessions
        .map((s) => (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
        .sort((a, b) => a - b);
      median = durs[Math.floor(durs.length / 2)];
    }

    out.push({
      channel,
      impressions,
      sessions: sCount,
      engaged_sessions: eCount,
      qualified_actions: qaCount,
      conversions: convCount,
      repeat_customers: repeatCustomersByChannel[channel] ?? 0,
      median_seconds_session_to_qa: Math.round(median),
    });
  }
  return out;
}

function pathLengthDistribution(journeys: CustomerJourney[]): { length: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const j of journeys) {
    const len = j.touchpoints.length;
    counts.set(len, (counts.get(len) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([length, count]) => ({ length, count }))
    .sort((a, b) => a.length - b.length);
}

function timeToConversionByChannel(journeys: CustomerJourney[]) {
  const byChannel = new Map<Channel, number[]>();
  for (const j of journeys) {
    if (!j.converted || !j.time_to_conversion_days) continue;
    const first = j.touchpoints[0]?.channel as Channel | undefined;
    if (!first) continue;
    const list = byChannel.get(first) ?? [];
    list.push(j.time_to_conversion_days);
    byChannel.set(first, list);
  }
  const out: { channel: Channel; median_days: number; mean_days: number }[] = [];
  for (const c of CHANNELS) {
    const arr = (byChannel.get(c) ?? []).sort((a, b) => a - b);
    if (arr.length === 0) {
      out.push({ channel: c, median_days: 0, mean_days: 0 });
      continue;
    }
    const median = arr[Math.floor(arr.length / 2)];
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    out.push({
      channel: c,
      median_days: Math.round(median * 10) / 10,
      mean_days: Math.round(mean * 10) / 10,
    });
  }
  return out;
}

// "What words convert" — phrase lift between conversion and non-conversion creative hooks
function buildWordResonance(
  creatives: Creative[],
  customers: Customer[],
  sessions: Session[],
): { phrase: string; lift: number; conversion_count: number }[] {
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'with', 'is', 'are',
    'i', 'you', 'we', 'be', 'your', 'our', 'this', 'that', 'it', 'have', 'has', 'do',
  ]);
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stop.has(w));

  const phraseFromCreative = (c: Creative) => tokenize(c.hook_text);

  // Determine each session's creative hook (from utm_content -> creative)
  const creativeById = new Map<string, Creative>();
  for (const c of creatives) creativeById.set(c.id, c);

  const phraseToConv = new Map<string, number>();
  const phraseToNonConv = new Map<string, number>();
  for (const s of sessions) {
    if (!s.utm_content) continue;
    const c = creativeById.get(s.utm_content);
    if (!c) continue;
    const phrases = phraseFromCreative(c);
    for (const p of phrases) {
      if (s.converted) phraseToConv.set(p, (phraseToConv.get(p) ?? 0) + 1);
      else phraseToNonConv.set(p, (phraseToNonConv.get(p) ?? 0) + 1);
    }
  }
  const out: { phrase: string; lift: number; conversion_count: number }[] = [];
  const totalConv = Array.from(phraseToConv.values()).reduce((a, b) => a + b, 0) + 1;
  const totalNon = Array.from(phraseToNonConv.values()).reduce((a, b) => a + b, 0) + 1;
  for (const [p, n] of phraseToConv.entries()) {
    const nNon = phraseToNonConv.get(p) ?? 0;
    if (n < 3) continue;
    const pConv = n / totalConv;
    const pNon = (nNon + 1) / totalNon;
    out.push({ phrase: p, lift: pConv / pNon, conversion_count: n });
  }
  out.sort((a, b) => b.lift - a.lift);
  return out.slice(0, 20);
}

function intentThemeFrequency(customers: Customer[]) {
  const map = new Map<IntentTag, number>();
  for (const c of customers) for (const t of c.intent_tags) map.set(t, (map.get(t) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────
function main() {
  const log = (m: string) => process.stdout.write(`▸ ${m}\n`);

  log('Generating offerings...');
  const offerings = generateOfferings(200);

  log('Generating creatives...');
  const creatives = generateCreatives();

  log('Generating ad spend...');
  const adSpend = generateAdSpend(creatives);

  log('Generating sessions, events, customers (this is the heavy step)...');
  const state = generateSessionsAndCustomers(adSpend, offerings);

  log('Building journeys...');
  const journeys = buildJourneys(state);

  log('Computing baseline attributions (last-click, first-click, linear, time-decay)...');
  const baseline = computeBaselineAttributions(journeys);

  log('Computing Markov chain attribution (real algorithm)...');
  const markov = computeMarkovAttribution(journeys);

  log('Training logistic regression for customer scoring...');
  const model = trainLogisticRegression(state.customers);
  log(`  → samples=${model.training_metrics.samples} acc=${model.training_metrics.accuracy.toFixed(3)} loss=${model.training_metrics.final_loss.toFixed(4)} base_rate=${model.training_metrics.base_rate.toFixed(3)}`);

  // Score every customer + estimate LTV (simple heuristic anchored to their conversion probability)
  for (const c of state.customers) {
    c.predicted_conversion_probability = scoreCustomer(c, model);
    const baseLtv = c.first_touch_channel === 'linkedin' ? 4200 : c.first_touch_channel === 'referral' ? 2800 : 2000;
    c.predicted_ltv_usd = Math.round(
      (c.converted
        ? (c.conversion_value_usd ?? baseLtv) * (1.0 + 0.6 * c.predicted_conversion_probability)
        : baseLtv * c.predicted_conversion_probability * 2.0) * 100,
    ) / 100;
  }

  log('Building channel metrics, timeseries, KPI summary...');
  const channelMetrics = buildChannelMetrics(adSpend, state.sessions, state.customers, state.conversions);
  const dailyTs = buildDailyTimeseries(adSpend, state.sessions, state.customers, state.conversions);
  const kpiSummary = buildKpiSummary(channelMetrics, state.conversions, state.customers);
  const funnelByChannel = buildFunnelByChannel(adSpend, state.sessions, state.customers, state.conversions);
  const pathLen = pathLengthDistribution(journeys);
  const ttcByChannel = timeToConversionByChannel(journeys);
  const wordResonance = buildWordResonance(creatives, state.customers, state.sessions);
  const intentFreq = intentThemeFrequency(state.customers);

  const attributionWeights: AttributionWeights = {
    ...baseline,
    markov: markov.weights,
  };

  const bundle: DataBundle = {
    generated_at: new Date().toISOString(),
    date_range: {
      start: isoDate(START_DATE),
      end: isoDate(TODAY),
    },
    ad_spend: adSpend,
    creatives,
    sessions: state.sessions,
    events: state.events,
    customers: state.customers,
    conversions: state.conversions,
    offerings,
    journeys,
    attribution_weights: attributionWeights,
    channel_metrics: channelMetrics,
    daily_timeseries: dailyTs,
    scoring_feature_importance: model.feature_importance,
    kpi_summary: kpiSummary,
    funnel_by_channel: funnelByChannel,
    path_length_distribution: pathLen,
    time_to_conversion_by_channel: ttcByChannel,
    word_resonance: wordResonance,
    intent_theme_frequency: intentFreq,
  };

  const outDir = path.join(process.cwd(), 'data');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // Split into purpose-built files so pages only load what they need.
  // The full bundle is 60+MB once events are included — never ship that to the client.

  const summary = {
    generated_at: bundle.generated_at,
    date_range: bundle.date_range,
    attribution_weights: bundle.attribution_weights,
    channel_metrics: bundle.channel_metrics,
    daily_timeseries: bundle.daily_timeseries,
    scoring_feature_importance: bundle.scoring_feature_importance,
    kpi_summary: bundle.kpi_summary,
    funnel_by_channel: bundle.funnel_by_channel,
    path_length_distribution: bundle.path_length_distribution,
    time_to_conversion_by_channel: bundle.time_to_conversion_by_channel,
    word_resonance: bundle.word_resonance,
    intent_theme_frequency: bundle.intent_theme_frequency,
  };

  writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary));
  writeFileSync(path.join(outDir, 'customers.json'), JSON.stringify(bundle.customers));
  writeFileSync(path.join(outDir, 'creatives.json'), JSON.stringify(bundle.creatives));
  writeFileSync(path.join(outDir, 'offerings.json'), JSON.stringify(bundle.offerings));
  writeFileSync(path.join(outDir, 'journeys.json'), JSON.stringify(bundle.journeys));
  writeFileSync(path.join(outDir, 'conversions.json'), JSON.stringify(bundle.conversions));
  writeFileSync(path.join(outDir, 'ad-spend.json'), JSON.stringify(bundle.ad_spend));

  // Pre-slice events by customer so individual customer pages load fast
  const eventsByCustomer = new Map<string, AnalyticsEvent[]>();
  for (const ev of bundle.events) {
    if (!ev.customer_id) continue;
    const arr = eventsByCustomer.get(ev.customer_id) ?? [];
    arr.push(ev);
    eventsByCustomer.set(ev.customer_id, arr);
  }
  const sessionsByCustomer = new Map<string, Session[]>();
  for (const s of bundle.sessions) {
    if (!s.customer_id) continue;
    const arr = sessionsByCustomer.get(s.customer_id) ?? [];
    arr.push(s);
    sessionsByCustomer.set(s.customer_id, arr);
  }
  const perCustomer: Record<string, { events: AnalyticsEvent[]; sessions: Session[] }> = {};
  for (const c of bundle.customers) {
    perCustomer[c.id] = {
      events: (eventsByCustomer.get(c.id) ?? []).sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp),
      ),
      sessions: (sessionsByCustomer.get(c.id) ?? []).sort((a, b) =>
        a.started_at.localeCompare(b.started_at),
      ),
    };
  }
  writeFileSync(path.join(outDir, 'customer-activity.json'), JSON.stringify(perCustomer));

  // Internal model + raw markov for the methodology / docs page
  writeFileSync(path.join(outDir, 'model.json'), JSON.stringify(model));
  writeFileSync(
    path.join(outDir, 'markov.json'),
    JSON.stringify({
      baseline_conversion_probability: markov.baseline_conversion_probability,
      removal_effects: markov.removal_effects,
      transition_matrix: markov.transition_matrix,
    }),
  );

  log('Done.');
  log(`  customers=${state.customers.length}`);
  log(`  sessions=${state.sessions.length}`);
  log(`  events=${state.events.length}`);
  log(`  conversions=${state.conversions.length}`);
  log(`  ad_spend rows=${adSpend.length}`);
  log(`  total spend=$${Math.round(adSpend.reduce((a, r) => a + r.spend_usd, 0)).toLocaleString()}`);
}

main();
