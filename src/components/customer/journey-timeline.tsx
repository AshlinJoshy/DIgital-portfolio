'use client';

import * as React from 'react';
import {
  Eye,
  MousePointerClick,
  Calendar,
  ShoppingCart,
  CreditCard,
  MessageCircle,
  Phone,
  PlayCircle,
  DollarSign,
  Video,
  CheckCircle2,
} from 'lucide-react';
import { ChannelIcon } from '@/components/channel-icon';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { AnalyticsEvent, EventName, Session, Touchpoint } from '@/lib/types';
import { CHANNEL_LABELS } from '@/lib/types';

interface Props {
  sessions: Session[];
  events: AnalyticsEvent[];
  touchpoints: Touchpoint[];
}

const EVENT_ICONS: Record<EventName, React.ComponentType<{ className?: string }>> = {
  pageview: Eye,
  product_view: Eye,
  product_details_expanded: PlayCircle,
  video_watched: Video,
  pricing_viewed: DollarSign,
  comparison_used: ShoppingCart,
  chat_opened: MessageCircle,
  whatsapp_clicked: MessageCircle,
  phone_clicked: Phone,
  form_submitted: CheckCircle2,
  qualified_action_completed: CheckCircle2,
  purchase_completed: CreditCard,
};

const EVENT_LABELS: Record<EventName, string> = {
  pageview: 'Pageview',
  product_view: 'Viewed product',
  product_details_expanded: 'Expanded product details',
  video_watched: 'Watched video',
  pricing_viewed: 'Viewed pricing',
  comparison_used: 'Used comparison tool',
  chat_opened: 'Opened chat',
  whatsapp_clicked: 'Clicked WhatsApp',
  phone_clicked: 'Clicked phone',
  form_submitted: 'Submitted form',
  qualified_action_completed: 'Completed qualified action',
  purchase_completed: 'Completed purchase',
};

const HIGHLIGHT_EVENTS: Set<EventName> = new Set([
  'form_submitted',
  'qualified_action_completed',
  'purchase_completed',
  'pricing_viewed',
  'comparison_used',
]);

export function JourneyTimeline({ sessions, events, touchpoints }: Props) {
  // Group events by session id
  const eventsBySession = React.useMemo(() => {
    const m = new Map<string, AnalyticsEvent[]>();
    for (const e of events) {
      const arr = m.get(e.session_id) ?? [];
      arr.push(e);
      m.set(e.session_id, arr);
    }
    return m;
  }, [events]);

  // Order sessions chronologically
  const orderedSessions = React.useMemo(
    () => [...sessions].sort((a, b) => a.started_at.localeCompare(b.started_at)),
    [sessions],
  );

  if (orderedSessions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-6 text-center">
        No identified sessions for this customer yet.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
      <div className="space-y-3">
        {orderedSessions.map((s, idx) => {
          const sessionEvents = (eventsBySession.get(s.id) ?? []).slice(0, 12);
          const tp = touchpoints.find((t) => t.session_id === s.id);
          return (
            <div key={s.id} className="relative pl-10 reveal" style={{ animationDelay: `${idx * 40}ms` }}>
              {/* Channel node */}
              <div className="absolute left-[3px] top-1 w-6 h-6 rounded-full flex items-center justify-center bg-card border-2 border-border ring-2 ring-background">
                <ChannelIcon channel={s.channel} size={16} />
              </div>

              <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-medium text-foreground">
                      {tp ? `Touchpoint ${tp.position}` : 'Session'} ·{' '}
                      <span className="text-muted-foreground">{CHANNEL_LABELS[s.channel]}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground tabular mt-0.5">
                      {new Date(s.started_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      })}{' '}
                      · {s.device} · {Math.round(
                        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000,
                      )}
                      s session
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {s.engaged && <Badge variant="default">engaged</Badge>}
                    {s.qualified_action && <Badge variant="accent">QA</Badge>}
                    {s.converted && <Badge variant="success">converted</Badge>}
                  </div>
                </div>

                {(s.utm_source || s.landing_page) && (
                  <div className="mt-2 text-[11px] text-muted-foreground font-mono space-y-0.5">
                    {s.landing_page && <div>↳ {s.landing_page}</div>}
                    {s.utm_source && (
                      <div className="opacity-80">
                        utm: {s.utm_source}
                        {s.utm_medium ? `/${s.utm_medium}` : ''}
                        {s.utm_campaign ? ` · ${s.utm_campaign}` : ''}
                      </div>
                    )}
                  </div>
                )}

                {sessionEvents.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    {sessionEvents.map((e) => {
                      const Icon = EVENT_ICONS[e.name] ?? MousePointerClick;
                      const isHighlight = HIGHLIGHT_EVENTS.has(e.name);
                      return (
                        <div
                          key={e.id}
                          className={cn(
                            'flex items-center gap-2 rounded px-2 py-1',
                            isHighlight
                              ? 'bg-accent/10 text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          <Icon className={cn('h-3 w-3', isHighlight && 'text-accent')} />
                          <span className="truncate">
                            <span className={cn(isHighlight && 'font-medium text-foreground')}>
                              {EVENT_LABELS[e.name]}
                            </span>
                            {e.url && (
                              <span className="ml-1 opacity-70 font-mono text-[10px]">{e.url}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
