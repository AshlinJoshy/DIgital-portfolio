import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMarkovDetails, getModelDetails, getSummary } from '@/lib/data';
import { formatNumber, formatPercent } from '@/lib/utils';

export default function DocsPage() {
  const summary = getSummary();
  const markov = getMarkovDetails();
  const model = getModelDetails();

  const topMarkov = Object.entries(markov.removal_effects)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <div className="space-y-2">
        <Badge variant="accent" className="w-fit">Methodology</Badge>
        <h1 className="font-display text-3xl font-medium tracking-tight text-balance">
          How the numbers on this site are actually calculated.
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Two real algorithms power the most interesting views: a Markov-chain attribution
          model and a logistic-regression conversion-probability model. Both run on the mock
          dataset at build time. This page walks through the math, the code, and the outputs.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium">1. Markov-chain attribution</h2>
        <p className="text-sm text-muted-foreground">
          Marketing attribution asks: when a conversion happens after a sequence of touchpoints,
          how much credit does each touchpoint deserve? Last-click gives all credit to the final
          touchpoint and is the default in most ad platforms — which makes it
          structurally biased.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>The model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[13.5px]">
            <p>
              We build a first-order Markov chain over the customer journey channels. The states
              are <span className="font-mono text-[12.5px]">START</span>,{' '}
              <span className="font-mono text-[12.5px]">CONVERT</span>,{' '}
              <span className="font-mono text-[12.5px]">NULL</span>, and one state per channel
              that appears in the data.
            </p>
            <p>
              From each journey we record transitions:{' '}
              <span className="font-mono text-[12.5px]">
                START → ch1 → ch2 → ... → CONVERT (or NULL)
              </span>
              . Normalising the counts gives a transition matrix.
            </p>
            <p>
              <span className="font-medium text-foreground">CONVERT</span> and{' '}
              <span className="font-medium text-foreground">NULL</span> are absorbing states. For
              an absorbing Markov chain with transition matrix split as{' '}
              <span className="font-mono text-[12.5px]">P = [[Q, R], [0, I]]</span>, the
              fundamental matrix is{' '}
              <span className="font-mono text-[12.5px]">N = (I − Q)⁻¹</span> and the absorption
              probabilities are <span className="font-mono text-[12.5px]">B = N · R</span>. The
              cell <span className="font-mono text-[12.5px]">B[START][CONVERT]</span> is the
              baseline probability that a typical journey reaches a conversion.
            </p>
            <p>
              <span className="font-medium text-foreground">Removal effect.</span> To find the
              attribution weight for a channel C, we rebuild the chain with every transition
              through C redirected to NULL, recompute the conversion probability, and measure how
              much it dropped: <span className="font-mono text-[12.5px]">RE(C) = p_baseline − p_without_C</span>.
              Normalising RE across channels gives shares that sum to 1.
            </p>
            <p className="text-muted-foreground">
              Reference: Anderl, Becker, Hofstede, von Wangenheim — &quot;Mapping the Customer
              Journey: a graph-based framework for attribution modelling&quot; (2016).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results from this dataset</CardTitle>
            <CardDescription>
              Baseline conversion probability:{' '}
              <span className="font-medium text-foreground tabular">
                {formatPercent(markov.baseline_conversion_probability, 2)}
              </span>{' '}
              · transitions observed:{' '}
              <span className="font-medium text-foreground tabular">
                {formatNumber(markov.transition_matrix.length)}
              </span>{' '}
              edges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-border/60 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 text-left font-medium">Channel</th>
                  <th className="py-2 text-right font-medium">Removal effect</th>
                  <th className="py-2 text-right font-medium">Markov share</th>
                </tr>
              </thead>
              <tbody>
                {topMarkov.map(([ch, re]) => (
                  <tr key={ch} className="border-b border-border/30">
                    <td className="py-2 capitalize">{ch}</td>
                    <td className="py-2 text-right tabular">{re.toFixed(4)}</td>
                    <td className="py-2 text-right tabular font-medium">
                      {formatPercent(summary.attribution_weights.markov[ch as never] ?? 0, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <CodeBlock
          filename="src/lib/algorithms/markov.ts"
          code={`function convertProbability(chain: AbsorbingChain): number {
  // Fundamental matrix N = (I - Q)^-1
  const n = chain.transient.length;
  const I = identity(n);
  const N = invert(subtract(I, chain.Q));
  // Absorption probabilities B = N · R
  const B = multiply(N, chain.R);
  const startIdx = chain.transient.indexOf(START);
  const convertIdx = chain.absorbing.indexOf(CONVERT);
  return B[startIdx][convertIdx];
}

export function computeMarkovAttribution(journeys) {
  const probs = normalize(buildTransitions(journeys));
  const chain = buildAbsorbing(probs);
  const baseline = convertProbability(chain);
  const removal = {};
  for (const ch of channelsInChain) {
    const reduced = removeChannel(chain, ch);
    removal[ch] = Math.max(0, baseline - convertProbability(reduced));
  }
  return normalize(removal);
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium">2. Customer conversion scoring</h2>
        <p className="text-sm text-muted-foreground">
          Every customer on the /customers page has a predicted conversion probability. This
          comes from a binary logistic-regression model trained at data-generation time on the
          mock dataset.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>The model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[13.5px]">
            <p>
              For each customer we build a feature vector — one-hot first-touch channel +
              log-scaled session count, pageviews, engagement events and recency. The target is{' '}
              <span className="font-mono text-[12.5px]">converted ∈ {`{0, 1}`}</span>.
            </p>
            <p>
              We standardize the log-scaled features (subtract mean, divide by std) and train
              with batch gradient descent on the negative log-likelihood:
            </p>
            <pre className="overflow-x-auto rounded-md border border-border/60 bg-muted/40 p-3 text-[12px] font-mono">
{`L(w) = -1/n · Σᵢ [yᵢ · log σ(z) + (1 − yᵢ) · log(1 − σ(z))] + λ/2 · ||w||²
where z = w₀ + Σⱼ wⱼ · xⱼ  and  σ(z) = 1 / (1 + e^(−z))`}
            </pre>
            <p>
              Hyperparameters: learning rate 0.1, L2 regularization λ=0.01, 400 epochs. Final
              training metrics on this run:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Samples" value={formatNumber(model.training_metrics.samples)} />
              <Metric
                label="Log-loss"
                value={model.training_metrics.final_loss.toFixed(4)}
              />
              <Metric
                label="Accuracy"
                value={formatPercent(model.training_metrics.accuracy, 1)}
              />
              <Metric
                label="Base rate"
                value={formatPercent(model.training_metrics.base_rate, 1)}
              />
            </div>
            <p className="text-muted-foreground text-[12px]">
              Accuracy is not a great metric on its own because the base rate is{' '}
              {formatPercent(model.training_metrics.base_rate, 1)} — a model that always predicts
              &quot;won&apos;t convert&quot; would also score high. The log-loss + the per-customer
              probability calibration on the profile page are the more informative outputs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trained feature weights</CardTitle>
            <CardDescription>
              Raw coefficients on the standardized features. Positive weights push toward
              conversion, negative away.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {[...model.feature_importance]
                .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
                .map((f) => (
                  <div key={f.feature} className="flex items-center gap-3">
                    <span className="font-mono text-[12px] w-[200px] truncate">{f.feature}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden relative">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                      <div
                        className={f.weight > 0 ? 'bg-emerald-500 absolute inset-y-0 left-1/2' : 'bg-rose-500 absolute inset-y-0 right-1/2'}
                        style={{
                          width: `${(Math.abs(f.weight) / Math.max(...model.feature_importance.map((x) => Math.abs(x.weight)))) * 50}%`,
                        }}
                      />
                    </div>
                    <span className="tabular text-[11px] text-muted-foreground w-[50px] text-right">
                      {f.weight.toFixed(3)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <CodeBlock
          filename="src/lib/algorithms/logistic-regression.ts"
          code={`for (let epoch = 0; epoch < epochs; epoch++) {
  const grad = new Array(numFeatures + 1).fill(0);
  for (let i = 0; i < n; i++) {
    let z = weights[0];
    for (let j = 0; j < numFeatures; j++) z += weights[j + 1] * X[i][j];
    const p = sigmoid(z);
    const err = p - y[i];
    grad[0] += err;
    for (let j = 0; j < numFeatures; j++) grad[j + 1] += err * X[i][j];
  }
  for (let j = 0; j <= numFeatures; j++) {
    grad[j] /= n;
    if (j > 0) grad[j] += lambda * weights[j];
    weights[j] -= lr * grad[j];
  }
}`}
        />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium">3. Funnel math</h2>
        <Card>
          <CardContent className="p-5 space-y-3 text-[13.5px]">
            <p>
              All funnel numbers are derived from the raw event stream, not stored as
              pre-aggregated metrics. For each channel we count: paid impressions (ad-server),
              sessions (GA4/PostHog), engaged sessions (PostHog rule), qualified actions (custom
              CRM event), conversions (CRM purchase event), repeat customers (≥ 2 conversions).
            </p>
            <p className="text-muted-foreground">
              The Session → Engaged rule is{' '}
              <span className="font-mono text-[12px]">duration &gt; 10s and events &gt; 1</span>,
              consistent with GA4&apos;s default engaged-session definition.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium">4. In production</h2>
        <Card>
          <CardContent className="p-5 space-y-3 text-[13.5px]">
            <p>
              The pages here are powered by static JSON snapshots generated at build time. In a
              real deployment the data layer would be:
            </p>
            <ul className="space-y-1.5 list-none pl-0">
              {[
                ['Google Ads API', 'Daily spend, clicks, impressions per campaign/ad_group/creative'],
                ['Meta Marketing API', 'Same shape as Google, plus creative metadata + thumbnails'],
                ['TikTok Marketing API', 'Same shape; report endpoints for spend and breakdowns'],
                ['LinkedIn Ads API', 'Campaign management + analytics endpoints'],
                ['Snapchat Marketing API', 'Same shape'],
                ['PostHog events API', 'Custom events from the website + product'],
                ['GA4 Data API', 'Session-level metrics and traffic source attribution'],
                ['CRM (Salesforce / HubSpot / custom)', 'Customers, owners, qualified actions, conversions'],
              ].map(([source, desc]) => (
                <li key={source} className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                  <span className="font-medium text-foreground w-[200px] shrink-0">{source}</span>
                  <span className="text-muted-foreground">{desc}</span>
                </li>
              ))}
            </ul>
            <p>
              Fivetran / Stitch / Airbyte (or first-party connectors) land each source into the
              warehouse hourly. dbt models normalize the schema across platforms (the{' '}
              <span className="font-mono text-[12px]">channel_metrics</span> view, the{' '}
              <span className="font-mono text-[12px]">customer_journeys</span> mart, etc.). The
              Markov + scoring jobs run on a daily Airflow / Dagster / Prefect schedule and
              update the same JSON shapes the app reads here.
            </p>
            <p className="text-muted-foreground">
              Every accessor in <span className="font-mono text-[12px]">src/lib/data.ts</span>{' '}
              includes a comment showing the equivalent SQL query you&apos;d issue against the
              warehouse — these are the exact integration points where credentials and
              endpoint URLs plug in for a real deployment.
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="text-center pt-4 text-[12px] text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-3">
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium tabular">{value}</div>
    </div>
  );
}

function CodeBlock({ filename, code }: { filename: string; code: string }) {
  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-border/60 px-4 py-1.5 text-[11px] font-mono text-muted-foreground">
        {filename}
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] font-mono leading-relaxed">{code}</pre>
    </div>
  );
}
