import * as React from 'react';
import Image from 'next/image';
import { ChannelIcon } from '@/components/channel-icon';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatNumber, formatUSD } from '@/lib/utils';
import type { AdSpendRow, Channel, Creative } from '@/lib/types';

export interface CreativePerf {
  creative: Creative;
  spend: number;
  clicks: number;
  conversions: number;
  cpa: number;
}

export function aggregateCreatives(
  creatives: Creative[],
  adSpend: AdSpendRow[],
  channel?: Channel,
): CreativePerf[] {
  const map = new Map<string, Omit<CreativePerf, 'cpa'>>();
  const creativeById = new Map<string, Creative>();
  for (const c of creatives) creativeById.set(c.id, c);
  for (const r of adSpend) {
    if (channel && r.channel !== channel) continue;
    const creative = creativeById.get(r.creative_id);
    if (!creative) continue;
    const cur = map.get(r.creative_id) ?? {
      creative,
      spend: 0,
      clicks: 0,
      conversions: 0,
    };
    cur.spend += r.spend_usd;
    cur.clicks += r.clicks;
    cur.conversions += r.platform_conversions;
    map.set(r.creative_id, cur);
  }
  return Array.from(map.values()).map((c) => ({
    ...c,
    cpa: c.conversions > 0 ? c.spend / c.conversions : Infinity,
  }));
}

interface Props {
  creatives: Creative[];
  adSpend: AdSpendRow[];
  channel?: Channel;
  limit?: number;
}

export function TopCreatives({ creatives, adSpend, channel, limit = 6 }: Props) {
  const top = aggregateCreatives(creatives, adSpend, channel)
    .filter((c) => c.conversions > 0)
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, limit);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {top.map((row) => (
        <Card key={row.creative.id} className="overflow-hidden hover:border-accent/40 transition-colors reveal">
          <div className="relative aspect-video bg-muted overflow-hidden">
            <Image
              src={row.creative.thumbnail_url}
              alt={row.creative.hook_text}
              fill
              sizes="320px"
              className="object-cover"
            />
            <div className="absolute top-2 left-2">
              <ChannelIcon channel={row.creative.channel} size={20} />
            </div>
            <div className="absolute top-2 right-2">
              <Badge variant="default" className="bg-background/85 text-foreground backdrop-blur">
                {row.creative.format}
              </Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="font-medium text-[13px] leading-snug text-foreground line-clamp-2 min-h-[2.4em]">
              &ldquo;{row.creative.hook_text}&rdquo;
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Conv.</div>
                <div className="font-medium tabular">{formatNumber(row.conversions)}</div>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">Spend</div>
                <div className="font-medium tabular">{formatUSD(row.spend)}</div>
              </div>
              <div>
                <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">CPA</div>
                <div className="font-medium tabular">
                  {row.cpa < Infinity ? formatUSD(row.cpa) : '—'}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {row.creative.intent_themes.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-[9px]">
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
