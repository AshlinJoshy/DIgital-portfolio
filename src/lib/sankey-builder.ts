/**
 * Build a Sankey graph (nodes + links) from customer journeys.
 * This runs server-side so the client only ever receives the aggregated graph.
 */

import type { Channel, CustomerJourney } from '@/lib/types';
import { CHANNEL_LABELS } from '@/lib/types';

export interface SankeyNode {
  name: string;
  category: 'first' | 'middle' | 'last' | 'outcome';
  channel?: Channel;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function buildSankey(journeys: CustomerJourney[]): SankeyData {
  // Collapse channels with <2% touchpoint share into "Other"
  const channelCounts = new Map<Channel, number>();
  for (const j of journeys) {
    for (const t of j.touchpoints) {
      channelCounts.set(t.channel, (channelCounts.get(t.channel) ?? 0) + 1);
    }
  }
  const total = Array.from(channelCounts.values()).reduce((a, b) => a + b, 0);
  const keep = new Set<Channel>();
  for (const [c, n] of channelCounts.entries()) {
    if (n / total >= 0.02) keep.add(c);
  }
  const norm = (c: Channel): string => (keep.has(c) ? CHANNEL_LABELS[c] : 'Other');

  const nodes: SankeyNode[] = [];
  const indexOf = new Map<string, number>();
  const ensure = (name: string, category: SankeyNode['category'], channel?: Channel): number => {
    const key = `${category}:${name}`;
    if (indexOf.has(key)) return indexOf.get(key)!;
    nodes.push({ name, category, channel });
    indexOf.set(key, nodes.length - 1);
    return nodes.length - 1;
  };

  const convertedIdx = ensure('Converted', 'outcome');
  const droppedIdx = ensure('Dropped', 'outcome');

  const linkCounts = new Map<string, number>();
  const bump = (s: number, t: number) => {
    const key = `${s}->${t}`;
    linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1);
  };

  for (const j of journeys) {
    if (j.touchpoints.length === 0) continue;
    const tps = j.touchpoints;
    const first = tps[0];
    const last = tps[tps.length - 1];
    const middle =
      tps.length >= 3 ? tps[Math.floor(tps.length / 2)] : tps[Math.min(1, tps.length - 1)];

    const firstIdx = ensure(
      norm(first.channel),
      'first',
      keep.has(first.channel) ? first.channel : undefined,
    );
    const middleIdx = ensure(
      norm(middle.channel),
      'middle',
      keep.has(middle.channel) ? middle.channel : undefined,
    );
    const lastIdx = ensure(
      norm(last.channel),
      'last',
      keep.has(last.channel) ? last.channel : undefined,
    );
    bump(firstIdx, middleIdx);
    bump(middleIdx, lastIdx);
    bump(lastIdx, j.converted ? convertedIdx : droppedIdx);
  }

  const links: SankeyLink[] = [];
  for (const [key, val] of linkCounts.entries()) {
    const [s, t] = key.split('->').map(Number);
    if (val > 0 && s !== t) links.push({ source: s, target: t, value: val });
  }
  return { nodes, links };
}
