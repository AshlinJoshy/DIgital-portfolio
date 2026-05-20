'use client';

import * as React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: { value: number }[];
  color?: string;
  height?: number;
  strokeWidth?: number;
}

export function Sparkline({ data, color = 'hsl(var(--accent))', height = 28, strokeWidth = 1.5 }: SparklineProps) {
  if (!data || data.length === 0) {
    return <div style={{ height }} />;
  }
  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
