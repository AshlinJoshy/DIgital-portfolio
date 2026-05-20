/**
 * Markov chain attribution.
 *
 * Given a set of customer journeys (ordered touchpoint sequences) and their
 * conversion outcomes, this builds a first-order transition matrix between
 * channels and uses the *removal effect* to allocate credit per channel.
 *
 * Removal effect for a channel C:
 *   1. compute baseline conversion probability of the full Markov chain
 *      via random-walk simulation from START to CONVERT vs NULL.
 *   2. for each channel C, remove all transitions through C (treat as
 *      transitions to NULL) and recompute conversion probability.
 *   3. removal_effect(C) = (baseline - p_without_C) / baseline
 *   4. normalize removal effects across channels so they sum to 1.
 *
 * This is the standard formulation (Anderl, Becker, Hofstede, von Wangenheim;
 * "Mapping the Customer Journey", 2016).
 *
 * Implementation notes:
 * - Uses an analytical absorbing-Markov-chain solution rather than Monte Carlo
 *   for stability and speed. The fundamental matrix N = (I - Q)^-1 gives expected
 *   visits per transient state; the absorption probabilities are N · R.
 * - States are: START, CONVERT (absorbing), NULL (absorbing), one per channel.
 */

import type { Channel, CustomerJourney } from '@/lib/types';
import { CHANNELS } from '@/lib/types';

const START = '__START__';
const CONVERT = '__CONVERT__';
const NULL_STATE = '__NULL__';

type State = string;

interface AbsorbingChain {
  states: State[];
  transient: State[];
  absorbing: State[];
  Q: number[][]; // transient → transient
  R: number[][]; // transient → absorbing
}

function buildTransitions(journeys: CustomerJourney[]): Map<State, Map<State, number>> {
  // counts[from][to] = number of observed transitions
  const counts = new Map<State, Map<State, number>>();
  const bump = (from: State, to: State) => {
    if (!counts.has(from)) counts.set(from, new Map());
    const inner = counts.get(from)!;
    inner.set(to, (inner.get(to) ?? 0) + 1);
  };

  for (const journey of journeys) {
    if (journey.touchpoints.length === 0) continue;
    const chain: State[] = [START, ...journey.touchpoints.map((t) => t.channel as State)];
    chain.push(journey.converted ? CONVERT : NULL_STATE);
    for (let i = 0; i < chain.length - 1; i++) {
      bump(chain[i], chain[i + 1]);
    }
  }

  return counts;
}

function normalize(counts: Map<State, Map<State, number>>): Map<State, Map<State, number>> {
  const probs = new Map<State, Map<State, number>>();
  for (const [from, inner] of counts.entries()) {
    const total = Array.from(inner.values()).reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    const row = new Map<State, number>();
    for (const [to, n] of inner.entries()) {
      row.set(to, n / total);
    }
    probs.set(from, row);
  }
  return probs;
}

function buildAbsorbing(probs: Map<State, Map<State, number>>): AbsorbingChain {
  const absorbing = [CONVERT, NULL_STATE];
  // transient = START + every channel observed
  const transientSet = new Set<State>([START]);
  for (const from of probs.keys()) {
    if (!absorbing.includes(from)) transientSet.add(from);
  }
  for (const inner of probs.values()) {
    for (const to of inner.keys()) {
      if (!absorbing.includes(to)) transientSet.add(to);
    }
  }
  const transient = Array.from(transientSet);
  const states = [...transient, ...absorbing];

  const Q: number[][] = transient.map(() => new Array(transient.length).fill(0));
  const R: number[][] = transient.map(() => new Array(absorbing.length).fill(0));

  for (let i = 0; i < transient.length; i++) {
    const from = transient[i];
    const row = probs.get(from);
    if (!row) continue;
    for (const [to, p] of row.entries()) {
      const tIdx = transient.indexOf(to);
      if (tIdx >= 0) {
        Q[i][tIdx] = p;
      } else {
        const aIdx = absorbing.indexOf(to);
        if (aIdx >= 0) R[i][aIdx] = p;
      }
    }
  }
  return { states, transient, absorbing, Q, R };
}

/**
 * Matrix inverse via Gauss-Jordan elimination. Sufficient for our small N (≤ ~12).
 */
function invert(matrix: number[][]): number[][] {
  const n = matrix.length;
  const a = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let i = 0; i < n; i++) {
    // partial pivot
    let pivot = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(a[k][i]) > Math.abs(a[pivot][i])) pivot = k;
    }
    if (Math.abs(a[pivot][i]) < 1e-12) {
      // singular — return identity slice as best-effort
      return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)));
    }
    [a[i], a[pivot]] = [a[pivot], a[i]];
    const div = a[i][i];
    for (let j = 0; j < 2 * n; j++) a[i][j] /= div;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = a[k][i];
      for (let j = 0; j < 2 * n; j++) a[k][j] -= factor * a[i][j];
    }
  }

  return a.map((row) => row.slice(n));
}

function multiply(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const inner = A[0]?.length ?? 0;
  const p = B[0]?.length ?? 0;
  const out: number[][] = Array.from({ length: m }, () => new Array(p).fill(0));
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = A[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < p; j++) out[i][j] += aik * B[k][j];
    }
  }
  return out;
}

function subtract(I: number[][], Q: number[][]): number[][] {
  return I.map((row, i) => row.map((v, j) => v - Q[i][j]));
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

/**
 * Compute the probability of reaching CONVERT from START in the given chain.
 * Uses fundamental matrix B = (I - Q)^-1 · R; B[startIdx][convertIdx] is the answer.
 */
function convertProbability(chain: AbsorbingChain): number {
  const n = chain.transient.length;
  if (n === 0) return 0;
  const I = identity(n);
  const N = invert(subtract(I, chain.Q));
  const B = multiply(N, chain.R);
  const startIdx = chain.transient.indexOf(START);
  const convertIdx = chain.absorbing.indexOf(CONVERT);
  if (startIdx < 0 || convertIdx < 0) return 0;
  const p = B[startIdx][convertIdx];
  return Number.isFinite(p) ? p : 0;
}

/**
 * Build a copy of the chain with `channel` removed: every transition INTO the channel
 * is redirected to NULL_STATE; every transition OUT OF the channel becomes a self-loop
 * to NULL via the absorbing structure (we drop the row entirely).
 *
 * Equivalent: rebuild the chain with all journeys' touchpoints filtered to skip `channel`.
 * We do this at the matrix level by re-routing.
 */
function removeChannel(chain: AbsorbingChain, channel: State): AbsorbingChain {
  const transient = chain.transient.filter((s) => s !== channel);
  if (transient.length === chain.transient.length) return chain;

  const n = transient.length;
  const Q: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const R: number[][] = Array.from({ length: n }, () => new Array(chain.absorbing.length).fill(0));
  const nullIdx = chain.absorbing.indexOf(NULL_STATE);

  for (let i = 0; i < n; i++) {
    const fromIdx = chain.transient.indexOf(transient[i]);
    // copy outgoing transient row excluding the removed channel
    for (let j = 0; j < n; j++) {
      const toIdx = chain.transient.indexOf(transient[j]);
      Q[i][j] = chain.Q[fromIdx][toIdx];
    }
    // mass that used to go to removed channel → NULL
    const removedColIdx = chain.transient.indexOf(channel);
    const lostMass = chain.Q[fromIdx][removedColIdx];
    for (let a = 0; a < chain.absorbing.length; a++) {
      R[i][a] = chain.R[fromIdx][a];
    }
    if (nullIdx >= 0) R[i][nullIdx] += lostMass;
  }

  return { states: [...transient, ...chain.absorbing], transient, absorbing: chain.absorbing, Q, R };
}

export interface MarkovResult {
  // channel → fraction of credit (sums to 1)
  weights: Record<Channel, number>;
  baseline_conversion_probability: number;
  removal_effects: Record<Channel, number>;
  transition_matrix: { from: string; to: string; probability: number; count: number }[];
}

export function computeMarkovAttribution(journeys: CustomerJourney[]): MarkovResult {
  const counts = buildTransitions(journeys);
  const probs = normalize(counts);
  const chain = buildAbsorbing(probs);
  const baseline = convertProbability(chain);

  const channelsInChain = chain.transient.filter((s) => s !== START) as Channel[];
  const removal: Record<Channel, number> = {} as Record<Channel, number>;

  for (const ch of channelsInChain) {
    const reduced = removeChannel(chain, ch);
    const p = convertProbability(reduced);
    removal[ch] = Math.max(0, baseline - p);
  }

  // Ensure all channels appear (0 if not in data)
  for (const c of CHANNELS) {
    if (!(c in removal)) removal[c] = 0;
  }

  const totalRemoval = Object.values(removal).reduce((a, b) => a + b, 0);
  const weights: Record<Channel, number> = {} as Record<Channel, number>;
  for (const c of CHANNELS) {
    weights[c] = totalRemoval > 0 ? removal[c] / totalRemoval : 0;
  }

  const transition_matrix: { from: string; to: string; probability: number; count: number }[] = [];
  for (const [from, inner] of probs.entries()) {
    const rawInner = counts.get(from)!;
    for (const [to, p] of inner.entries()) {
      transition_matrix.push({ from, to, probability: p, count: rawInner.get(to) ?? 0 });
    }
  }

  return {
    weights,
    baseline_conversion_probability: baseline,
    removal_effects: removal,
    transition_matrix,
  };
}

/**
 * Simple position-based attribution models for comparison.
 */
export function computeBaselineAttributions(journeys: CustomerJourney[]) {
  const init = (): Record<Channel, number> => {
    const obj = {} as Record<Channel, number>;
    for (const c of CHANNELS) obj[c] = 0;
    return obj;
  };

  const last_click = init();
  const first_click = init();
  const linear = init();
  const time_decay = init();

  for (const journey of journeys) {
    if (!journey.converted || journey.touchpoints.length === 0) continue;
    const tps = journey.touchpoints;
    const conversionValue = journey.conversion_value_usd ?? 1;

    // Last-click: all credit to final touchpoint
    last_click[tps[tps.length - 1].channel as Channel] += conversionValue;

    // First-click: all credit to first
    first_click[tps[0].channel as Channel] += conversionValue;

    // Linear: equal split
    const share = conversionValue / tps.length;
    for (const tp of tps) linear[tp.channel as Channel] += share;

    // Time-decay: exponential weighting with 7-day half-life relative to conversion time
    const conversionTs = new Date(tps[tps.length - 1].timestamp).getTime();
    const halfLifeMs = 7 * 24 * 60 * 60 * 1000;
    const decayWeights = tps.map((tp) => {
      const dt = conversionTs - new Date(tp.timestamp).getTime();
      return Math.pow(0.5, dt / halfLifeMs);
    });
    const decaySum = decayWeights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < tps.length; i++) {
      time_decay[tps[i].channel as Channel] += (conversionValue * decayWeights[i]) / decaySum;
    }
  }

  const normalize = (obj: Record<Channel, number>): Record<Channel, number> => {
    const total = Object.values(obj).reduce((a, b) => a + b, 0);
    const out = {} as Record<Channel, number>;
    for (const c of CHANNELS) out[c] = total > 0 ? obj[c] / total : 0;
    return out;
  };

  return {
    last_click: normalize(last_click),
    first_click: normalize(first_click),
    linear: normalize(linear),
    time_decay: normalize(time_decay),
  };
}
