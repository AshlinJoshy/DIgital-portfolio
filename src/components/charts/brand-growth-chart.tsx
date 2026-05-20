'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { formatNumber, formatUSD } from '@/lib/utils';
import type { BrandGrowthMonthly } from '@/lib/types';

interface Props {
  data: BrandGrowthMonthly[];
}

export function BrandGrowthChart({ data }: Props) {
  const milestones = data.filter((d) => d.milestone);
  return (
    <div className="h-[340px] w-full reveal">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 24, right: 18, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="spendGrowth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.32} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(v) => fmtMonth(v)}
            tickLine={false}
            axisLine={false}
            dy={6}
            interval={2}
          />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tickFormatter={(v) => formatUSD(v, { compact: true })}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tickFormatter={(v) => formatNumber(v, true)}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(l) => fmtMonth(String(l))}
                formatter={(value, name) => {
                  if (name === 'paid_spend_usd') return formatUSD(Number(value));
                  if (name === 'conversions') return formatNumber(Number(value));
                  return String(value);
                }}
              />
            }
          />
          {milestones.map((m) => (
            <ReferenceLine
              key={m.month}
              x={m.month}
              yAxisId="spend"
              stroke="hsl(var(--accent) / 0.5)"
              strokeDasharray="3 3"
            />
          ))}
          <Area
            yAxisId="spend"
            type="monotone"
            dataKey="paid_spend_usd"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            fill="url(#spendGrowth)"
            isAnimationActive
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="conversions"
            stroke="hsl(160 50% 45%)"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="customers_acquired"
            stroke="hsl(220 75% 60%)"
            strokeWidth={1.4}
            dot={false}
            strokeDasharray="3 3"
            isAnimationActive
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function fmtMonth(m: string): string {
  if (!m || m.length < 7) return m;
  const [year, month] = m.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
