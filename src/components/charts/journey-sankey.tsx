'use client';

import * as React from 'react';
import { sankey, sankeyLinkHorizontal, sankeyJustify, type SankeyGraph } from 'd3-sankey';
import { CHANNEL_COLORS } from '@/lib/types';
import type { SankeyData, SankeyNode, SankeyLink } from '@/lib/sankey-builder';

interface Props {
  data: SankeyData;
}

export function JourneySankey({ data }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(800);
  const HEIGHT = 460;

  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.floor(e.contentRect.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const layout = React.useMemo(() => {
    if (!data.nodes.length) return null;
    const generator = sankey<SankeyNode, SankeyLink>()
      .nodeAlign(sankeyJustify)
      .nodeWidth(12)
      .nodePadding(10)
      .extent([
        [1, 8],
        [width - 1, HEIGHT - 8],
      ]);
    const graph: SankeyGraph<SankeyNode, SankeyLink> = {
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    };
    return generator(graph);
  }, [data, width]);

  const linkPath = sankeyLinkHorizontal();

  return (
    <div ref={containerRef} className="w-full reveal">
      {layout && (
        <svg width={width} height={HEIGHT} className="overflow-visible">
          {layout.links.map((l, i) => {
            const sourceNode = l.source as unknown as SankeyNode;
            const color = sourceNode.channel
              ? CHANNEL_COLORS[sourceNode.channel]
              : 'hsl(var(--muted-foreground))';
            return (
              <path
                key={i}
                d={linkPath(l) ?? ''}
                stroke={color}
                strokeOpacity={0.22}
                strokeWidth={Math.max(1, l.width ?? 0)}
                fill="none"
              >
                <title>
                  {(l.source as unknown as SankeyNode).name} →{' '}
                  {(l.target as unknown as SankeyNode).name}: {l.value.toLocaleString()}
                </title>
              </path>
            );
          })}
          {layout.nodes.map((n, i) => {
            const color = n.channel
              ? CHANNEL_COLORS[n.channel]
              : n.category === 'outcome' && n.name === 'Converted'
                ? 'hsl(160 50% 45%)'
                : n.category === 'outcome'
                  ? 'hsl(215 20% 50%)'
                  : 'hsl(var(--accent))';
            const x = n.x0 ?? 0;
            const y = n.y0 ?? 0;
            const w = (n.x1 ?? 0) - x;
            const h = (n.y1 ?? 0) - y;
            return (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity={0.85} rx={2} />
                <text
                  x={x < width / 2 ? (n.x1 ?? 0) + 6 : x - 6}
                  y={y + h / 2}
                  dy="0.35em"
                  textAnchor={x < width / 2 ? 'start' : 'end'}
                  fontSize={11}
                  className="fill-foreground"
                >
                  <tspan className="font-medium">{n.name}</tspan>
                  <tspan className="fill-muted-foreground" dx={6}>
                    {((n.value ?? 0) as number).toLocaleString()}
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <div className="mt-3 grid grid-cols-4 text-[10.5px] uppercase tracking-wider text-muted-foreground px-2">
        <div>First touch</div>
        <div>Middle touch</div>
        <div>Last touch</div>
        <div className="text-right">Outcome</div>
      </div>
    </div>
  );
}
