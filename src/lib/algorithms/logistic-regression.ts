/**
 * Logistic regression for customer conversion-probability scoring.
 *
 * Trained at data-generation time on the mock customer set. Features:
 *   - one-hot first_touch_channel (paid channels)
 *   - session_count (log-scaled)
 *   - total_pageviews (log-scaled)
 *   - total_engagement_events (log-scaled)
 *   - days_since_first_touch (log-scaled)
 *   - is_referral_partner_sourced (binary)
 *
 * Optimization: batch gradient descent with L2 regularization.
 * For the dataset size (~5,000 customers, ~12 features), this converges
 * in well under a second.
 */

import type { Channel, Customer } from '@/lib/types';

export interface TrainedModel {
  feature_names: string[];
  weights: number[]; // includes bias as weights[0]
  feature_importance: { feature: string; weight: number; description: string }[];
  mean: number[];
  std: number[];
  training_metrics: {
    samples: number;
    final_loss: number;
    accuracy: number;
    base_rate: number;
  };
}

const PAID_FIRST_TOUCH: Channel[] = ['google', 'meta', 'tiktok', 'linkedin', 'snapchat'];

function safelog(x: number): number {
  return Math.log(1 + Math.max(0, x));
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

function featurize(customer: Customer): { names: string[]; values: number[] } {
  const names: string[] = [];
  const values: number[] = [];

  for (const c of PAID_FIRST_TOUCH) {
    names.push(`first_touch_${c}`);
    values.push(customer.first_touch_channel === c ? 1 : 0);
  }
  names.push('first_touch_organic');
  values.push(customer.first_touch_channel === 'organic' ? 1 : 0);
  names.push('first_touch_referral');
  values.push(customer.first_touch_channel === 'referral' ? 1 : 0);

  names.push('log_session_count');
  values.push(safelog(customer.session_count));

  names.push('log_pageviews');
  values.push(safelog(customer.total_pageviews));

  names.push('log_engagement_events');
  values.push(safelog(customer.total_engagement_events));

  names.push('log_days_since_first_touch');
  values.push(safelog(customer.days_since_first_touch));

  names.push('is_referral_partner_sourced');
  values.push(customer.is_referral_partner_sourced ? 1 : 0);

  return { names, values };
}

export function trainLogisticRegression(customers: Customer[]): TrainedModel {
  if (customers.length === 0) {
    throw new Error('Cannot train on empty dataset');
  }

  // Build feature matrix
  const sample0 = featurize(customers[0]);
  const featureNames = sample0.names;
  const numFeatures = featureNames.length;
  const n = customers.length;

  const X: number[][] = customers.map((c) => featurize(c).values);
  const y: number[] = customers.map((c) => (c.converted ? 1 : 0));

  // Standardize continuous features (mean/std), skip the dummies
  const mean = new Array(numFeatures).fill(0);
  const std = new Array(numFeatures).fill(1);
  const isContinuous = featureNames.map((name) => name.startsWith('log_'));

  for (let j = 0; j < numFeatures; j++) {
    if (!isContinuous[j]) continue;
    let m = 0;
    for (let i = 0; i < n; i++) m += X[i][j];
    m /= n;
    mean[j] = m;
    let v = 0;
    for (let i = 0; i < n; i++) v += (X[i][j] - m) ** 2;
    v = Math.sqrt(v / n);
    std[j] = v > 1e-8 ? v : 1;
    for (let i = 0; i < n; i++) X[i][j] = (X[i][j] - m) / std[j];
  }

  // Train with gradient descent + L2
  const lr = 0.1;
  const lambda = 0.01;
  const epochs = 400;
  const weights = new Array(numFeatures + 1).fill(0); // index 0 = bias

  for (let epoch = 0; epoch < epochs; epoch++) {
    const grad = new Array(numFeatures + 1).fill(0);
    for (let i = 0; i < n; i++) {
      let z = weights[0];
      for (let j = 0; j < numFeatures; j++) z += weights[j + 1] * X[i][j];
      const p = sigmoid(z);
      const err = p - y[i];
      grad[0] += err;
      for (let j = 0; j < numFeatures; j++) grad[j + 1] += err * X[i][j];
    }
    // average + L2 (no penalty on bias)
    for (let j = 0; j <= numFeatures; j++) {
      grad[j] /= n;
      if (j > 0) grad[j] += lambda * weights[j];
      weights[j] -= lr * grad[j];
    }
  }

  // Compute final loss + accuracy
  let loss = 0;
  let correct = 0;
  for (let i = 0; i < n; i++) {
    let z = weights[0];
    for (let j = 0; j < numFeatures; j++) z += weights[j + 1] * X[i][j];
    const p = sigmoid(z);
    const yi = y[i];
    const eps = 1e-12;
    loss -= yi * Math.log(p + eps) + (1 - yi) * Math.log(1 - p + eps);
    if ((p >= 0.5 ? 1 : 0) === yi) correct++;
  }
  loss /= n;

  const baseRate = y.reduce((a, b) => a + b, 0) / n;

  const descriptions: Record<string, string> = {
    first_touch_google: 'First-touch channel was Google Ads',
    first_touch_meta: 'First-touch channel was Meta Ads',
    first_touch_tiktok: 'First-touch channel was TikTok',
    first_touch_linkedin: 'First-touch channel was LinkedIn',
    first_touch_snapchat: 'First-touch channel was Snapchat',
    first_touch_organic: 'First-touch channel was Organic',
    first_touch_referral: 'First-touch channel was Referral',
    log_session_count: 'Number of sessions (log-scaled)',
    log_pageviews: 'Total pageviews (log-scaled)',
    log_engagement_events: 'High-intent engagement events (log-scaled)',
    log_days_since_first_touch: 'Recency: days since first touch (log-scaled)',
    is_referral_partner_sourced: 'Sourced via referral partner',
  };

  const feature_importance = featureNames.map((name, idx) => ({
    feature: name,
    weight: weights[idx + 1],
    description: descriptions[name] ?? name,
  }));

  return {
    feature_names: featureNames,
    weights,
    feature_importance,
    mean,
    std,
    training_metrics: { samples: n, final_loss: loss, accuracy: correct / n, base_rate: baseRate },
  };
}

export function scoreCustomer(customer: Customer, model: TrainedModel): number {
  const { values } = featurize(customer);
  // Standardize continuous features using stored stats
  const standardized = values.map((v, j) => {
    if (model.feature_names[j]?.startsWith('log_')) {
      return (v - model.mean[j]) / (model.std[j] || 1);
    }
    return v;
  });
  let z = model.weights[0];
  for (let j = 0; j < model.feature_names.length; j++) {
    z += model.weights[j + 1] * standardized[j];
  }
  return sigmoid(z);
}
