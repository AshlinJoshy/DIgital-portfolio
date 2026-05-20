'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { filterByRange, useDateRange } from '@/components/date-range-context';
import { formatNumber, formatUSD } from '@/lib/utils';
import type { DailyTimeseries } from '@/lib/types';

interface Props {
  data: DailyTimeseries[];
  endDate: string;
}

export function OverviewTimeseries({ data, endDate }: Props) {
  const { range } = useDateRange();
  const filtered = filterByRange(data, range, endDate);

  // Bucket if too many points
  const bucketed = filtered.length > 90 ? bucketWeekly(filtered) : filtered;

  return (
    <div className="h-[280px] w-full reveal">
      <ResponsiveContainer>
        <ComposedChart data={bucketed} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => fmtTick(v)}
            tickLine={false}
            axisLine={false}
            dy={6}
          />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tickFormatter={(v) => formatUSD(v, { compact: true })}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tickFormatter={(v) => formatNumber(v, true)}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(l) => fmtLabel(String(l))}
                formatter={(value, name) => {
                  if (name === 'spend_usd') return formatUSD(Number(value));
                  return formatNumber(Number(value));
                }}
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={7}
            formatter={(value) => {
              if (value === 'spend_usd') return 'Ad spend';
              if (value === 'customers_acquired') return 'Customers';
              if (value === 'conversions') return 'Conversions';
              return value;
            }}
          />
          <Area
            yAxisId="spend"
            type="monotone"
            dataKey="spend_usd"
            stroke="hsl(var(--accent))"
            strokeWidth={1.8}
            fill="url(#spendFill)"
            isAnimationActive
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="customers_acquired"
            stroke="hsl(220 75% 60%)"
            strokeWidth={1.6}
            dot={false}
            isAnimationActive
          />
          <Bar
            yAxisId="count"
            dataKey="conversions"
            fill="hsl(160 50% 45%)"
            fillOpacity={0.85}
            barSize={bucketed.length > 50 ? 3 : 8}
            isAnimationActive
            radius={[2, 2, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function bucketWeekly(rows: DailyTimeseries[]): DailyTimeseries[] {
  const buckets = new Map<string, DailyTimeseries>();
  for (const r of rows) {
    const d = new Date(r.date);
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() - d.getUTCDay());
    const key = weekStart.toISOString().slice(0, 10);
    const cur = buckets.get(key) ?? {
      date: key,
      spend_usd: 0,
      sessions: 0,
      qualified_actions: 0,
      conversions: 0,
      conversion_value_usd: 0,
      customers_acquired: 0,
    };
    cur.spend_usd += r.spend_usd;
    cur.sessions += r.sessions;
    cur.qualified_actions += r.qualified_actions;
    cur.conversions += r.conversions;
    cur.conversion_value_usd += r.conversion_value_usd;
    cur.customers_acquired += r.customers_acquired;
    buckets.set(key, cur);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function fmtTick(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtLabel(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
