import * as React from 'react';
import type { Channel } from '@/lib/types';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  channel: Channel;
  size?: number;
  className?: string;
  withLabel?: boolean;
}

const LETTER: Record<Channel, string> = {
  google: 'G',
  meta: 'M',
  tiktok: 'T',
  linkedin: 'in',
  snapchat: 'S',
  referral: 'R',
  organic: 'O',
  direct: 'D',
  email: 'E',
};

export function ChannelIcon({ channel, size = 18, className, withLabel }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="inline-flex items-center justify-center rounded-md font-semibold text-white"
        style={{
          width: size,
          height: size,
          background: CHANNEL_COLORS[channel],
          fontSize: size * 0.55,
        }}
        aria-hidden
      >
        {LETTER[channel]}
      </span>
      {withLabel && (
        <span className="text-[12px] font-medium text-foreground">{CHANNEL_LABELS[channel]}</span>
      )}
    </span>
  );
}

export function ChannelDot({ channel, size = 10 }: { channel: Channel; size?: number }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, background: CHANNEL_COLORS[channel] }}
      aria-hidden
    />
  );
}
