'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { CHANNEL_COLORS, CHANNEL_LABELS, type AttributionWeights, type Channel } from '@/lib/types';
import { formatPercent } from '@/lib/utils';

interface Props {
  weights: AttributionWeights;
}

const MODELS: { key: keyof AttributionWeights; label: string }[] = [
  { key: 'last_click', label: 'Last click' },
  { key: 'first_click', label: 'First click' },
  { key: 'linear', label: 'Linear' },
  { key: 'time_decay', label: 'Time decay' },
  { key: 'markov', label: 'Markov chain' },
];

export function AttributionComparison({ weights }: Props) {
  // pivot: one row per model; one bar segment per channel
  const channels: Channel[] = (Object.keys(weights.last_click) as Channel[]).filter((c) => {
    const max = Math.max(
      weights.last_click[c],
      weights.first_click[c],
      weights.linear[c],
      weights.time_decay[c],
      weights.markov[c],
    );
    return max > 0.005;
  });

  const data = MODELS.map((m) => {
    const row: Record<string, number | string> = { model: m.label };
    for (const c of channels) row[c] = weights[m.key][c] ?? 0;
    return row;
  });

  return (
    <div className="h-[300px] w-full reveal">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 32 }}>
          <CartesianGrid strokeDasharray="2 4" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => formatPercent(v, 0)}
            tickLine={false}
            axisLine={false}
            domain={[0, 1]}
          />
          <YAxis
            type="category"
            dataKey="model"
            tickLine={false}
            axisLine={false}
            width={88}
            tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}
            content={
              <ChartTooltip
                formatter={(value, name) =>
                  `${formatPercent(Number(value), 1)} · ${CHANNEL_LABELS[name as Channel] ?? name}`
                }
                hideLabel={false}
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 10.5, paddingTop: 6 }}
            iconType="circle"
            iconSize={6}
            formatter={(value) => CHANNEL_LABELS[value as Channel] ?? value}
          />
          {channels.map((c) => (
            <Bar key={c} dataKey={c} stackId="all" fill={CHANNEL_COLORS[c]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
