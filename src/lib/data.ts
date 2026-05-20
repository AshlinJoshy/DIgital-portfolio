/**
 * Server-side data accessor with module-level caching.
 *
 * In production this layer would issue queries against the warehouse
 * (BigQuery / Snowflake) joined from the source-system tables landed
 * by Fivetran / Stitch / Airbyte etc. Each accessor below maps to the
 * SQL query you'd actually write — they're commented with the equivalent.
 *
 * Today they read pre-built JSON snapshots that were generated at build time.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { cache } from 'react';
import type {
  AdSpendRow,
  AnalyticsEvent,
  AttributionWeights,
  BrandGrowthMonthly,
  BrandedSearchBreakdown,
  ChannelMetrics,
  Conversion,
  Creative,
  Customer,
  CustomerJourney,
  DailyChannelMetric,
  DailyTimeseries,
  FunnelByChannelRow,
  IntentTag,
  KpiSummary,
  Offering,
  ScoringFeatureWeight,
  Session,
} from '@/lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, filename), 'utf8')) as T;
}

interface Summary {
  generated_at: string;
  date_range: { start: string; end: string };
  attribution_weights: AttributionWeights;
  channel_metrics: ChannelMetrics[];
  daily_timeseries: DailyTimeseries[];
  scoring_feature_importance: ScoringFeatureWeight[];
  kpi_summary: KpiSummary;
  funnel_by_channel: FunnelByChannelRow[];
  path_length_distribution: { length: number; count: number }[];
  time_to_conversion_by_channel: { channel: string; median_days: number; mean_days: number }[];
  word_resonance: { phrase: string; lift: number; conversion_count: number }[];
  intent_theme_frequency: { tag: IntentTag; count: number }[];
  branded_search_breakdown: BrandedSearchBreakdown;
}

/** /* SQL: SELECT * FROM mart.dashboard_summary */
export const getSummary = cache((): Summary => loadJson<Summary>('summary.json'));

/** /* SQL: SELECT * FROM mart.brand_growth_monthly ORDER BY month */
export const getBrandGrowth = cache((): BrandGrowthMonthly[] =>
  loadJson<BrandGrowthMonthly[]>('brand-growth.json'),
);

/** /* SQL: SELECT * FROM mart.daily_channel_metrics */
export const getDailyByChannel = cache((): DailyChannelMetric[] =>
  loadJson<DailyChannelMetric[]>('daily-by-channel.json'),
);

/** /* SQL: SELECT * FROM crm.customers ORDER BY created_at DESC */
export const getCustomers = cache((): Customer[] => loadJson<Customer[]>('customers.json'));

export const getCustomerById = cache((id: string): Customer | undefined =>
  getCustomers().find((c) => c.id === id),
);

interface CustomerActivity {
  events: AnalyticsEvent[];
  sessions: Session[];
}

/** /* SQL: SELECT e.*, s.* FROM posthog.events e JOIN ga4.sessions s ON ... WHERE customer_id=? */
export const getCustomerActivity = cache(
  (customerId: string): CustomerActivity => {
    const all = loadJson<Record<string, CustomerActivity>>('customer-activity.json');
    return all[customerId] ?? { events: [], sessions: [] };
  },
);

/** /* SQL: SELECT * FROM ads.creatives */
export const getCreatives = cache((): Creative[] => loadJson<Creative[]>('creatives.json'));

/** /* SQL: SELECT * FROM catalog.offerings */
export const getOfferings = cache((): Offering[] => loadJson<Offering[]>('offerings.json'));

/** /* SQL: SELECT * FROM mart.customer_journeys */
export const getJourneys = cache((): CustomerJourney[] => loadJson<CustomerJourney[]>('journeys.json'));

/** /* SQL: SELECT * FROM crm.conversions ORDER BY occurred_at DESC */
export const getConversions = cache((): Conversion[] => loadJson<Conversion[]>('conversions.json'));

/** /* SQL: SELECT * FROM ads.daily_spend WHERE date BETWEEN ? AND ? */
export const getAdSpend = cache((): AdSpendRow[] => loadJson<AdSpendRow[]>('ad-spend.json'));

interface MarkovDetails {
  baseline_conversion_probability: number;
  removal_effects: Record<string, number>;
  transition_matrix: { from: string; to: string; probability: number; count: number }[];
}

export const getMarkovDetails = cache((): MarkovDetails => loadJson<MarkovDetails>('markov.json'));

interface ModelDetails {
  feature_names: string[];
  weights: number[];
  feature_importance: { feature: string; weight: number; description: string }[];
  mean: number[];
  std: number[];
  training_metrics: { samples: number; final_loss: number; accuracy: number; base_rate: number };
}

export const getModelDetails = cache((): ModelDetails => loadJson<ModelDetails>('model.json'));
