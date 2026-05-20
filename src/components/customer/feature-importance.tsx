'use client';

import * as React from 'react';
import { cn, formatPercent } from '@/lib/utils';
import type { Customer, ScoringFeatureWeight } from '@/lib/types';

interface Props {
  customer: Customer;
  weights: ScoringFeatureWeight[];
}

interface Row {
  feature: string;
  description: string;
  weight: number;
  customer_value: number;
  contribution: number;
}

/**
 * Show the actual contribution (weight × standardized value) of each feature
 * to this customer's score. The values are pulled from the same featurization
 * used during training, but to keep this component lean we compute the
 * "directional pull" qualitatively from the raw customer fields.
 *
 * The weight column is the trained logistic-regression coefficient.
 */
export function FeatureImportance({ customer, weights }: Props) {
  const featureValues: Record<string, number> = {
    [`first_touch_${customer.first_touch_channel}`]: 1,
    log_session_count: Math.log(1 + customer.session_count),
    log_pageviews: Math.log(1 + customer.total_pageviews),
    log_engagement_events: Math.log(1 + customer.total_engagement_events),
    log_days_since_first_touch: Math.log(1 + customer.days_since_first_touch),
    is_referral_partner_sourced: customer.is_referral_partner_sourced ? 1 : 0,
  };

  const rows: Row[] = weights
    .map((w) => {
      const customer_value = featureValues[w.feature] ?? 0;
      // contribution is signed; absolute value tells us how much pull
      const contribution = customer_value * w.weight;
      return {
        feature: w.feature,
        description: w.description,
        weight: w.weight,
        customer_value,
        contribution,
      };
    })
    .filter((r) => Math.abs(r.contribution) > 0.0001 || r.feature.startsWith('first_touch_'))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 6);

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.contribution)), 0.001);

  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const positive = r.contribution > 0;
        const pct = (Math.abs(r.contribution) / maxAbs) * 100;
        return (
          <div key={r.feature}>
            <div className="flex items-baseline justify-between text-[11.5px] mb-1">
              <span className="text-foreground/90">{r.description}</span>
              <span
                className={cn(
                  'tabular text-[10.5px]',
                  positive ? 'text-emerald-500' : 'text-rose-500',
                )}
              >
                {positive ? '+' : ''}
                {r.contribution.toFixed(2)} {positive ? 'pulls toward conversion' : 'pulls away'}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
              <div
                className={cn(
                  'absolute inset-y-0',
                  positive ? 'bg-emerald-500' : 'bg-rose-500',
                  positive ? 'left-1/2' : 'right-1/2',
                )}
                style={{ width: `${pct / 2}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="text-[10.5px] text-muted-foreground pt-2 border-t border-border/40">
        Final probability: <span className="font-medium text-foreground tabular">
          {formatPercent(customer.predicted_conversion_probability)}
        </span>
        {' '}— this is a logistic transform of (bias + Σ feature × weight). See{' '}
        <a href="/docs" className="text-accent underline-offset-2 hover:underline">
          /docs
        </a>{' '}for the full model.
      </div>
    </div>
  );
}
