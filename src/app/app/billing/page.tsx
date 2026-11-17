import { billingEnvFromProcess, resolveBillingMode } from "@/domain/billing";
import { PLAN_LABEL } from "@/domain/labels";
import { PLAN_LIMITS, type LimitResource } from "@/domain/plans";
import { can } from "@/domain/permissions";
import { Flash } from "@/components/flash";
import { requireWorkspace } from "@/lib/context";
import { usedCount } from "@/server/usage";

const ROWS: Array<{ resource: LimitResource; label: string }> = [
  { resource: "members", label: "Members" },
  { resource: "clients", label: "Clients" },
  { resource: "openTasks", label: "Open tasks" },
  { resource: "invoices", label: "Invoices, excluding void" },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { membership } = await requireWorkspace();
  const params = await searchParams;
  const organization = membership.organization;
  const mode = resolveBillingMode(billingEnvFromProcess());
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
  const usage = {
    members: await usedCount(organization.id, "members"),
    clients: await usedCount(organization.id, "clients"),
    openTasks: await usedCount(organization.id, "openTasks"),
    invoices: await usedCount(organization.id, "invoices"),
  };
  const owner = can(membership.role, "billing:manage");
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Billing</h1>
          <p className="lede">One subscription for the workspace. It is not a per-seat charge.</p>
        </div>
        <p className="plan-chip">
          Plan <strong data-testid="plan-name">{PLAN_LABEL[organization.plan]}</strong>
        </p>
      </header>
      <Flash error={params.error} notice={params.notice} />
      {organization.subscriptionStatus === "PAST_DUE" ? (
        <p className="banner bad" role="status">
          The Stripe subscription is past due. Pro limits stay until the subscription is canceled.
        </p>
      ) : null}
      <table className="table">
        <thead>
          <tr>
            <th>Limit</th>
            <th>Used</th>
            <th>Free</th>
            <th>Pro</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.resource}>
              <td>{row.label}</td>
              <td>{usage[row.resource]}</td>
              <td>{PLAN_LIMITS.FREE[row.resource]}</td>
              <td>{PLAN_LIMITS.PRO[row.resource]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!owner ? <p>Only an owner can change the plan.</p> : null}
      {owner && mode === "mock" ? (
        <section className="card stack">
          <h2>Local mock</h2>
          <p>
            Stripe keys are not configured, or billing is set to mock. Activating Pro writes the plan
            in the database. No card is charged.
          </p>
          {organization.plan === "FREE" ? (
            <form method="post" action="/api/billing/mock-activate">
              <input type="hidden" name="organizationId" value={organization.id} />
              <button className="btn primary" type="submit">
                Activate Pro
              </button>
            </form>
          ) : (
            <form method="post" action="/api/billing/mock-cancel">
              <input type="hidden" name="organizationId" value={organization.id} />
              <button className="btn" type="submit">
                Return to Free
              </button>
            </form>
          )}
        </section>
      ) : null}
      {owner && mode === "stripe" ? (
        <section className="card stack">
          <h2>Stripe test mode</h2>
          {stripeReady ? (
            <>
              <p>
                Checkout uses a Stripe test-mode price. Use the test card 4242 4242 4242 4242. The plan
                changes when <code>/api/billing/webhook</code> accepts the signed event.
              </p>
              <form method="post" action="/api/billing/checkout">
                <input type="hidden" name="organizationId" value={organization.id} />
                <button className="btn primary" type="submit">
                  Continue to Stripe test checkout
                </button>
              </form>
            </>
          ) : (
            <p>Stripe mode is selected, but STRIPE_SECRET_KEY or STRIPE_PRICE_ID is missing.</p>
          )}
        </section>
      ) : null}
    </>
  );
}
