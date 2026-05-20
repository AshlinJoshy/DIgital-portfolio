import { Badge } from '@/components/ui/badge';
import { CustomerList, type CustomerListItem } from '@/components/customer-list';
import { KpiCard } from '@/components/kpi-card';
import { getCustomers } from '@/lib/data';
import { formatNumber, formatPercent, formatUSD } from '@/lib/utils';

export default function CustomersPage() {
  const customers = getCustomers();
  const converted = customers.filter((c) => c.converted);
  const totalPredictedLtv = customers.reduce((a, c) => a + c.predicted_ltv_usd, 0);
  const highIntent = customers.filter(
    (c) => !c.converted && c.predicted_conversion_probability >= 0.5,
  );
  const referralSourced = customers.filter((c) => c.is_referral_partner_sourced);

  // Strip down to only the fields the list needs, so we don't ship event/touchpoint history
  const listItems: CustomerListItem[] = customers.map((c) => ({
    id: c.id,
    initials: `${c.first_name.charAt(0)}${c.last_name.charAt(0)}`,
    full_name: `${c.first_name} ${c.last_name}`,
    email: c.email,
    first_touch_channel: c.first_touch_channel,
    current_stage: c.current_stage,
    predicted_conversion_probability: c.predicted_conversion_probability,
    predicted_ltv_usd: c.predicted_ltv_usd,
    created_at: c.created_at,
    converted: c.converted,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-2 max-w-3xl">
        <Badge variant="accent" className="w-fit">Customers</Badge>
        <h1 className="font-display text-3xl font-medium tracking-tight text-balance">
          The pipeline as people, not numbers.
        </h1>
        <p className="text-sm text-muted-foreground">
          Every identified customer with their funnel stage, predicted conversion probability,
          and predicted lifetime value — scored by a logistic-regression model trained on this
          dataset. Click into anyone to see their full journey.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Identified customers"
          value={formatNumber(customers.length)}
          hint={`${formatNumber(converted.length)} converted (${formatPercent(
            converted.length / customers.length,
            1,
          )})`}
        />
        <KpiCard
          label="High-intent pipeline"
          value={formatNumber(highIntent.length)}
          hint="Score ≥ 0.5 and not yet converted"
          accent
        />
        <KpiCard
          label="Predicted LTV (all)"
          value={formatUSD(totalPredictedLtv)}
          hint="Σ predicted_ltv_usd"
        />
        <KpiCard
          label="Referral-sourced"
          value={formatNumber(referralSourced.length)}
          hint="Partial attribution segment"
        />
      </div>

      <CustomerList customers={listItems} />
    </div>
  );
}
