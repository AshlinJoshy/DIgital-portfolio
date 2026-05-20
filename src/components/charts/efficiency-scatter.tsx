'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  ReferenceLine,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { CHANNEL_COLORS, CHANNEL_LABELS, type ChannelMetrics } from '@/lib/types';
import { formatUSD, formatPercent } from '@/lib/utils';

interface Props {
  metrics: ChannelMetrics[];
}

export function EfficiencyScatter({ metrics }: Props) {
  const data = metrics
    .filter((m) => m.spend_usd > 0 && m.cpa > 0 && m.conversions > 0)
    .map((m) => ({
      channel: m.channel,
      name: CHANNEL_LABELS[m.channel],
      x: m.share_of_spend,
      y: m.cpa,
      z: m.conversions,
      conversions: m.conversions,
      roas: m.roas,
      color: CHANNEL_COLORS[m.channel],
    }));

  const avgCpa = data.reduce((a, d) => a + d.y, 0) / data.length;

  return (
    <div className="h-[300px] w-full reveal">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 12, right: 24, bottom: 36, left: 8 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 'dataMax']}
            tickFormatter={(v) => formatPercent(v, 0)}
            tickLine={false}
            axisLine={false}
            label={{
              value: 'Share of spend →',
              position: 'insideBottom',
              offset: -16,
              style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            tickFormatter={(v) => formatUSD(v, { compact: true })}
            tickLine={false}
            axisLine={false}
            label={{
              value: '↑ Cost per conversion',
              angle: -90,
              position: 'insideLeft',
              offset: 16,
              style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
            }}
          />
          <ZAxis type="number" dataKey="z" range={[120, 1400]} />
          <ReferenceLine
            y={avgCpa}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            label={{ value: 'avg', position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <Tooltip
            cursor={{ stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={
              <ChartTooltip
                hideLabel
                formatter={(value, name) => {
                  if (name === 'x') return formatPercent(Number(value), 1);
                  if (name === 'y') return formatUSD(Number(value));
                  return String(value);
                }}
              />
            }
          />
          <Scatter
            data={data}
            shape={(props: unknown) => {
              const p = props as { cx: number; cy: number; payload: typeof data[number] & { z: number } };
              const { cx, cy, payload } = p;
              const r = Math.max(8, Math.sqrt(payload.z) * 1.5);
              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={payload.color}
                    fillOpacity={0.18}
                    stroke={payload.color}
                    strokeWidth={1.2}
                  />
                  <circle cx={cx} cy={cy} r={3} fill={payload.color} />
                  <text
                    x={cx + r + 4}
                    y={cy + 4}
                    fontSize={11}
                    fill="hsl(var(--foreground))"
                    fontWeight={500}
                  >
                    {payload.name}
                  </text>
                </g>
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
