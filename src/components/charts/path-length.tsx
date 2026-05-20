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
  Cell,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { formatNumber } from '@/lib/utils';

interface Props {
  data: { length: number; count: number }[];
}

export function PathLengthHistogram({ data }: Props) {
  const max = data.reduce((a, d) => Math.max(a, d.count), 0);

  return (
    <div className="h-[260px] w-full reveal">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="length"
            tickLine={false}
            axisLine={false}
            label={{
              value: 'Touchpoints before conversion (or now)',
              position: 'insideBottom',
              offset: -16,
              style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
            }}
          />
          <YAxis tickFormatter={(v) => formatNumber(v, true)} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.3 }}
            content={
              <ChartTooltip
                labelFormatter={(l) => `${l} touchpoints`}
                formatter={(value) => formatNumber(Number(value)) + ' customers'}
              />
            }
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.count === max ? 'hsl(var(--accent))' : 'hsl(var(--foreground) / 0.55)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
