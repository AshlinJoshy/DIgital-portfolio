# Convergence · Marketing Intelligence

A unified, portfolio-grade marketing intelligence dashboard for multi-channel consumer brands. Simulates a fully integrated data stack — Google Ads, Meta Ads, TikTok Ads, LinkedIn Ads, Snapchat, PostHog, GA4, and an internal CRM — surfaced as one analytics workspace.

> **Live demo:** _[deploy to Vercel and replace this URL]_

## What this is

This is the kind of dashboard a digital marketing team would actually live inside — not a static set of charts, but a connected surface where:

- Every dollar of paid spend is traced to outcomes per channel, campaign, and creative.
- Customer journeys from first ad impression to purchase are reconstructed end-to-end.
- Attribution is computed five different ways — including a real **Markov chain** model running on the journey data, not a hardcoded number.
- Every identified customer has a **logistic-regression conversion probability** with per-feature explanation.
- An attribution-reallocation view tells you where the chain's credit doesn't match the budget.

Mock data is generated at build time but the algorithms running on it are real.

## Pages

| Page | What's there |
| --- | --- |
| `/` Overview | KPI tiles, blended ROAS, headline insights, daily spend × outcomes timeseries, sortable channel summary table |
| `/channels` | Per-channel cards (CPC, CPQA, CPA, ROAS), efficiency scatter (CPA vs share-of-spend), campaign breakdown, top Meta creatives, top Google keywords |
| `/journey` | Multi-touch Sankey diagram, attribution model comparison (Last-click / First-click / Linear / Time-decay / **Markov**), path length distribution, time-to-conversion by channel |
| `/funnel` | Overall funnel from impression → conversion → repeat, drop-off rates per stage, funnel-by-channel small multiples |
| `/customers` | Searchable, filterable customer list with score, predicted LTV, recency |
| `/customers/[id]` | The centerpiece — full journey timeline with channel icons and event log, predicted conversion probability with feature contributions, intent tags, products explored |
| `/content` | Top performing creatives, "what words convert" phrase lift, intent theme frequency, landing page resonance |
| `/attribution` | Recommended budget reallocation based on Markov credit vs current spend share |
| `/docs` | Methodology — the math behind the Markov attribution and logistic-regression scoring, plus the production data architecture |

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                  │
├────────────────────────────────────────────────────────────────────────────┤
│  Google Ads API   Meta Marketing API   TikTok Ads API   LinkedIn Ads API   │
│  Snapchat Ads API                                                          │
│  PostHog events API                    GA4 Data API                        │
│  CRM (Salesforce / HubSpot / custom Postgres replica)                      │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      INGESTION (hourly cadence)                            │
│  Fivetran / Stitch / Airbyte / first-party connectors                      │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          WAREHOUSE (BigQuery / Snowflake)                  │
├────────────────────────────────────────────────────────────────────────────┤
│  raw_google_ads.daily_spend         raw_posthog.events                     │
│  raw_meta_ads.daily_spend           raw_ga4.sessions                       │
│  raw_tiktok_ads.daily_spend         raw_crm.customers                      │
│  raw_linkedin_ads.daily_spend       raw_crm.conversions                    │
│  raw_snapchat_ads.daily_spend                                              │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         dbt MODELS (daily refresh)                         │
├────────────────────────────────────────────────────────────────────────────┤
│  stg_*  (per-source typing/cleanup)                                        │
│  int_*  (joins, deduplication)                                             │
│  mart_channel_metrics  ← rolled-up per-channel KPIs                        │
│  mart_customer_journeys  ← ordered touchpoint sequence per customer        │
│  mart_dashboard_summary  ← what the / page consumes                        │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│              MODEL JOBS (Airflow / Dagster / Prefect, daily)               │
├────────────────────────────────────────────────────────────────────────────┤
│  • Markov-chain attribution     (src/lib/algorithms/markov.ts)             │
│  • Logistic-regression scoring  (src/lib/algorithms/logistic-regression.ts)│
│  Outputs back to warehouse + cached as JSON                                │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      Next.js APP (this repo)                               │
├────────────────────────────────────────────────────────────────────────────┤
│  • Server components query the warehouse (today: read snapshot JSON)       │
│  • All accessors in src/lib/data.ts contain the equivalent SQL as a /*…*/  │
│    comment — drop-in replacements for real connections                     │
│  • Recharts + d3-sankey + custom SVG for visualization                     │
│  • shadcn/ui primitives, Tailwind, Inter + Fraunces, dark/light themes     │
└────────────────────────────────────────────────────────────────────────────┘
```

In production this would...
- Replace `readFileSync` in `src/lib/data.ts` with warehouse client calls (`@google-cloud/bigquery`, `snowflake-sdk`, or a Postgres pool against the warehouse export).
- Run the Markov + logistic-regression jobs as a nightly Python or TypeScript task that writes the outputs back to the warehouse as model tables (`mart_attribution_weights`, `mart_customer_scores`).
- Add a thin caching layer (Redis or React's built-in `cache()` already used here) so the dashboard pages don't hit the warehouse on every request.
- Authenticate viewers via NextAuth + an SSO provider; gate by team/role.
- Push the daily KPI digest to Slack/Email via a separate cron job that queries `mart_dashboard_summary`.

## Real algorithms

These are not faked or pre-computed — they run in TypeScript on the mock journeys at build time.

### Markov chain attribution

`src/lib/algorithms/markov.ts` (~280 lines)

- Builds a transition-count matrix from every observed `START → ch1 → ch2 → … → CONVERT/NULL` chain.
- Constructs the absorbing Markov chain `P = [[Q, R], [0, I]]`.
- Computes the fundamental matrix `N = (I − Q)⁻¹` via Gauss-Jordan elimination, then absorption probabilities `B = N · R`.
- For each channel, redirects its mass to NULL and recomputes the conversion probability — the difference is the **removal effect**.
- Removal effects, normalized across channels, become the Markov attribution weights.

Reference: Anderl, Becker, Hofstede & von Wangenheim — _"Mapping the Customer Journey"_ (2016).

### Customer conversion scoring

`src/lib/algorithms/logistic-regression.ts` (~180 lines)

- Features: one-hot first-touch channel, log-scaled session count, pageviews, engagement events, days since first touch, referral-partner flag.
- Standardizes continuous features (zero mean, unit variance).
- Trains with batch gradient descent on the L2-regularized negative log-likelihood.
- Persists weights to `data/model.json`; `scoreCustomer()` applies them at read time.

The `/customers/[id]` page breaks the score down per feature so you can see what's pulling the prediction up or down.

### Funnel math

All funnel views compute actual stage counts from the joined event stream (no hardcoded percentages). See `scripts/generate-data.ts` → `buildFunnelByChannel()`.

## Tech stack & design decisions

- **Next.js 14 (App Router)** — server components for the heavy data accessors, client components only where interactivity is needed (sort, filter, charts).
- **TypeScript** — every domain type lives in `src/lib/types.ts`, mirroring the warehouse schema you'd actually have.
- **shadcn/ui + Tailwind** — primitives bundled directly (no opaque library); custom token system for the deep-navy + warm-gold + off-white palette.
- **Inter + Fraunces + JetBrains Mono** — three weights of voice: UI, display, monospace for numbers and code blocks.
- **Recharts** for line/bar/composed/scatter charts. **d3-sankey** for the Sankey diagram (server-rendered SVG). Custom SVG for the funnel and feature-importance bars.
- **No backend services required at runtime** — data accessors read JSON files that are produced at build time by `npm run build`. The dashboard ships as a static deployment, which is also why Vercel deployment is one click.
- **Performance** — the full event stream (~260k events) and per-customer activity are sliced at build time so individual customer pages load only the slice they need. The channel and customer pages do server-side aggregation before sending any data to the client.

## Run locally

```bash
npm install
npm run generate-data     # produces /data/*.json (deterministic; seed = 20260101)
npm run dev               # http://localhost:3000
```

## Deploy to Vercel

```bash
vercel
```

That's it — no env vars, no external services. The `npm run build` step regenerates the dataset before bundling the app.

## Where real credentials would plug in

Every data accessor in `src/lib/data.ts` carries a `/* SQL: ... */` comment showing the warehouse query you'd issue once the integrations are in place. To wire it up to real sources, you'd:

1. Replace `loadJson<...>(...)` calls with warehouse client calls (BigQuery / Snowflake / Postgres).
2. Replace `scripts/generate-data.ts` with a model job runner that takes warehouse rows in and writes Markov + scoring outputs back out.
3. Provide auth secrets via Vercel env vars (or your platform's secret store) — none committed.

## Repo layout

```
src/
├── app/                       # Next.js app-router pages
│   ├── page.tsx               #   / — Executive Overview
│   ├── channels/page.tsx      #   /channels
│   ├── journey/page.tsx       #   /journey
│   ├── funnel/page.tsx        #   /funnel
│   ├── customers/page.tsx     #   /customers
│   ├── customers/[id]/page.tsx#   /customers/[id]
│   ├── content/page.tsx       #   /content
│   ├── attribution/page.tsx   #   /attribution
│   └── docs/page.tsx          #   /docs
├── components/
│   ├── ui/                    # shadcn primitives (button, card, badge, …)
│   ├── charts/                # Recharts wrappers + custom SVG charts
│   ├── customer/              # Customer-profile sub-components
│   ├── nav.tsx                # Top navigation
│   └── …
├── lib/
│   ├── algorithms/
│   │   ├── markov.ts          # Markov chain attribution (~280 lines)
│   │   └── logistic-regression.ts  # Logistic regression (~180 lines)
│   ├── data.ts                # Server-side accessors w/ equivalent SQL
│   ├── types.ts               # Domain types
│   ├── utils.ts               # Formatters
│   └── sankey-builder.ts      # Server-side journey → Sankey aggregation
scripts/
└── generate-data.ts           # Build-time mock data generator
data/                          # JSON snapshots consumed by the app
```

## License

Personal portfolio project. Code is MIT-licensed; visuals and copy are illustrative.
