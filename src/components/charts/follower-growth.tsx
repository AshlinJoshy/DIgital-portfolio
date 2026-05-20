'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { formatNumber } from '@/lib/utils';
import type { BrandGrowthMonthly } from '@/lib/types';

interface Props {
  data: BrandGrowthMonthly[];
  metric: 'instagram_followers' | 'tiktok_followers' | 'branded_search_volume' | 'google_quality_score';
  color: string;
  unit?: string;
}

const LABELS: Record<Props['metric'], string> = {
  instagram_followers: 'Instagram followers',
  tiktok_followers: 'TikTok followers',
  branded_search_volume: 'Branded search volume (monthly)',
  google_quality_score: 'Google Ads Quality Score (avg)',
};

export function FollowerGrowth({ data, metric, color, unit }: Props) {
  return (
    <div className="h-[180px] w-full reveal">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(v) => fmtMonth(v)}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tickFormatter={(v) => (metric === 'google_quality_score' ? v.toFixed(1) : formatNumber(v, true))}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip
            content={
              <ChartTooltip
                labelFormatter={(l) => fmtMonth(String(l))}
                formatter={(value) => {
                  const v = Number(value);
                  if (metric === 'google_quality_score') return `${v.toFixed(1)} / 10`;
                  return formatNumber(v) + (unit ? ` ${unit}` : '');
                }}
              />
            }
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${metric})`}
            isAnimationActive
          />
        </AreaChart>
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

