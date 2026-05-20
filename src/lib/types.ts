/**
 * Core types for the marketing intelligence platform.
 *
 * In production these would mirror the shape of normalized data
 * landed into a warehouse (BigQuery / Snowflake / Redshift) from
 * the source systems listed in each section's comment.
 */

export type Channel =
  | 'google'
  | 'meta'
  | 'tiktok'
  | 'linkedin'
  | 'snapchat'
  | 'referral'
  | 'organic'
  | 'direct'
  | 'email';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export type FunnelStage =
  | 'impression'
  | 'session'
  | 'engaged_session'
  | 'qualified_action'
  | 'conversion'
  | 'repeat_customer';

export type EventName =
  | 'pageview'
  | 'product_view'
  | 'product_details_expanded'
  | 'video_watched'
  | 'pricing_viewed'
  | 'comparison_used'
  | 'chat_opened'
  | 'whatsapp_clicked'
  | 'phone_clicked'
  | 'form_submitted'
  | 'qualified_action_completed'
  | 'purchase_completed';

export type IntentTag =
  | 'price-sensitive'
  | 'feature-focused'
  | 'comparison-shopping'
  | 'ready-to-buy'
  | 'researching'
  | 'returning-evaluator'
  | 'social-proof-seeker';

// ─────────────────────────────────────────────────────────────────────────
// AD PLATFORM DATA
// In production: Google Ads API, Meta Marketing API, TikTok Ads API,
// LinkedIn Ads API, Snapchat Ads API — landed daily into ads_spend table.
// ─────────────────────────────────────────────────────────────────────────

export interface AdSpendRow {
  date: string; // ISO date
  channel: Channel;
  campaign_id: string;
  campaign_name: string;
  ad_group_id: string;
  ad_group_name: string;
  creative_id: string;
  creative_name: string;
  impressions: number;
  clicks: number;
  spend_usd: number;
  // platform-attributed conversions (last-click on platform)
  platform_conversions: number;
}

export interface Creative {
  id: string;
  channel: Channel;
  name: string;
  format: 'video' | 'image' | 'carousel' | 'text';
  thumbnail_url: string;
  hook_text: string;
  ctas: string[];
  intent_themes: IntentTag[];
}

// ─────────────────────────────────────────────────────────────────────────
// WEB / PRODUCT ANALYTICS
// In production: PostHog events + GA4 sessions, joined by session_id.
// ─────────────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  customer_id?: string; // null until identified
  anonymous_id: string;
  started_at: string;
  ended_at: string;
  device: DeviceType;
  channel: Channel;
  campaign_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  landing_page: string;
  referrer?: string;
  page_count: number;
  events_count: number;
  engaged: boolean; // session > 10s with > 1 event
  qualified_action: boolean;
  converted: boolean;
}

export interface AnalyticsEvent {
  id: string;
  session_id: string;
  customer_id?: string;
  timestamp: string;
  name: EventName;
  url?: string;
  properties?: Record<string, string | number | boolean>;
}

// ─────────────────────────────────────────────────────────────────────────
// CRM
// In production: SQL replica from internal CRM (Salesforce / HubSpot / custom).
// ─────────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  created_at: string;
  first_touch_channel: Channel;
  last_touch_channel: Channel;
  current_stage: FunnelStage;
  account_owner?: string;
  session_count: number;
  total_pageviews: number;
  total_engagement_events: number;
  days_since_first_touch: number;
  predicted_conversion_probability: number;
  predicted_ltv_usd: number;
  intent_tags: IntentTag[];
  converted: boolean;
  conversion_value_usd?: number;
  qualified_action_at?: string;
  conversion_at?: string;
  is_referral_partner_sourced: boolean;
}

export interface Conversion {
  id: string;
  customer_id: string;
  occurred_at: string;
  value_usd: number;
  sku_id: string;
  attribution_channel: Channel; // last-click default
}

export interface Offering {
  id: string;
  name: string;
  category: string;
  base_price_usd: number;
  image_url: string;
}

// ─────────────────────────────────────────────────────────────────────────
// JOURNEY / ATTRIBUTION
// Derived: customer journey is the ordered sequence of touchpoints
// (channel, optional campaign) per customer up to conversion or now().
// ─────────────────────────────────────────────────────────────────────────

export interface Touchpoint {
  customer_id: string;
  position: number;
  channel: Channel;
  campaign_id?: string;
  timestamp: string;
  session_id?: string;
}

export interface CustomerJourney {
  customer_id: string;
  touchpoints: Touchpoint[];
  converted: boolean;
  conversion_value_usd?: number;
  time_to_conversion_days?: number;
}

// ─────────────────────────────────────────────────────────────────────────
// MODEL OUTPUTS
// ─────────────────────────────────────────────────────────────────────────

export interface AttributionWeights {
  // channel → fraction of credit (sums to 1)
  last_click: Record<Channel, number>;
  first_click: Record<Channel, number>;
  linear: Record<Channel, number>;
  time_decay: Record<Channel, number>;
  markov: Record<Channel, number>;
}

export interface ChannelMetrics {
  channel: Channel;
  spend_usd: number;
  impressions: number;
  clicks: number;
  sessions: number;
  qualified_actions: number;
  conversions: number;
  conversion_value_usd: number;
  cpc: number;
  cpl: number;
  cpqa: number;
  cpa: number;
  ctr: number;
  conversion_rate: number;
  share_of_spend: number;
  roas: number;
}

export interface ScoringFeatureWeight {
  feature: string;
  weight: number;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────
// AGGREGATE / DASHBOARD
// ─────────────────────────────────────────────────────────────────────────

export interface KpiSummary {
  total_spend_usd: number;
  customers_acquired: number;
  qualified_actions: number;
  conversions: number;
  conversion_value_usd: number;
  true_cost_per_conversion: number;
  pipeline_value_usd: number;
  blended_roas: number;
}

export interface DataBundle {
  generated_at: string;
  date_range: { start: string; end: string };
  ad_spend: AdSpendRow[];
  creatives: Creative[];
  sessions: Session[];
  events: AnalyticsEvent[];
  customers: Customer[];
  conversions: Conversion[];
  offerings: Offering[];
  journeys: CustomerJourney[];
  attribution_weights: AttributionWeights;
  channel_metrics: ChannelMetrics[];
  daily_timeseries: DailyTimeseries[];
  scoring_feature_importance: ScoringFeatureWeight[];
  kpi_summary: KpiSummary;
  funnel_by_channel: FunnelByChannelRow[];
  path_length_distribution: { length: number; count: number }[];
  time_to_conversion_by_channel: { channel: Channel; median_days: number; mean_days: number }[];
  word_resonance: { phrase: string; lift: number; conversion_count: number }[];
  intent_theme_frequency: { tag: IntentTag; count: number }[];
}

export interface DailyTimeseries {
  date: string;
  spend_usd: number;
  sessions: number;
  qualified_actions: number;
  conversions: number;
  conversion_value_usd: number;
  customers_acquired: number;
}

export interface BrandGrowthMonthly {
  month: string;
  month_index: number;
  paid_spend_usd: number;
  customers_acquired: number;
  conversions: number;
  blended_roas: number;
  instagram_followers: number;
  tiktok_followers: number;
  google_quality_score: number;
  branded_search_volume: number;
  organic_share_of_sessions: number;
  milestone?: string;
}

export interface BrandedSearchBreakdown {
  branded: {
    spend_usd: number;
    conversions: number;
    conversion_value_usd: number;
    roas: number;
    share_of_google_spend: number;
    share_of_google_value: number;
  };
  non_branded: {
    spend_usd: number;
    conversions: number;
    conversion_value_usd: number;
    roas: number;
  };
}

export interface FunnelByChannelRow {
  channel: Channel;
  impressions: number;
  sessions: number;
  engaged_sessions: number;
  qualified_actions: number;
  conversions: number;
  repeat_customers: number;
  median_seconds_session_to_qa: number;
}

export const CHANNELS: Channel[] = [
  'google',
  'meta',
  'tiktok',
  'linkedin',
  'snapchat',
  'referral',
  'organic',
  'direct',
  'email',
];

export const CHANNEL_LABELS: Record<Channel, string> = {
  google: 'Google Ads',
  meta: 'Meta Ads',
  tiktok: 'TikTok Ads',
  linkedin: 'LinkedIn Ads',
  snapchat: 'Snapchat',
  referral: 'Referral',
  organic: 'Organic',
  direct: 'Direct',
  email: 'Email',
};

export const PAID_CHANNELS: Channel[] = ['google', 'meta', 'tiktok', 'linkedin', 'snapchat'];

export const CHANNEL_COLORS: Record<Channel, string> = {
  google: 'hsl(212 75% 55%)',
  meta: 'hsl(258 65% 60%)',
  tiktok: 'hsl(340 75% 55%)',
  linkedin: 'hsl(200 80% 40%)',
  snapchat: 'hsl(50 90% 55%)',
  referral: 'hsl(38 70% 55%)',
  organic: 'hsl(160 50% 45%)',
  direct: 'hsl(215 20% 50%)',
  email: 'hsl(20 70% 55%)',
};
