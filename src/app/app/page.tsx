import { PLAN_LABEL } from "@/domain/labels";
import { safeQueryMessage } from "@/domain/text";
import { Gate } from "@/components/shell";
import { Flash } from "@/components/flash";
import { loadContext } from "@/lib/context";
import { prisma } from "@/lib/db";
import { formatDate } from "@/domain/labels";
import { workspaceStats } from "@/server/usage";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const context = await loadContext();
  const session = context.session;
  const membership = context.membership;
  if (!session?.user?.id) return null;
  if (!membership) {
    return (
      <Gate name={session.user.name ?? "There"} error={safeQueryMessage(params.error) ?? undefined} />
    );
  }
  const organization = membership.organization;
  const [stats, activity] = await Promise.all([
    workspaceStats(organization.id),
    prisma.activity.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true } } },
    }),
  ]);
  return (
    <>
      <header className="page-header">
        <div>
          <p className="kicker">{organization.name}</p>
          <h1>Overview</h1>
        </div>
        <p className="plan-chip">
          Plan <strong data-testid="plan-name">{PLAN_LABEL[organization.plan]}</strong>
        </p>
      </header>
      <Flash error={params.error} notice={params.notice} />
      <section className="stats">
        <article className="card">
          <p className="kicker">Open tasks</p>
          <p className="stat" data-testid="open-tasks">
            {stats.openTasks}
          </p>
        </article>
        <article className="card">
          <p className="kicker">Clients</p>
          <p className="stat" data-testid="clients">
            {stats.clients}
          </p>
        </article>
        <article className="card">
          <p className="kicker">Open invoices</p>
          <p className="stat" data-testid="open-invoices">
            {stats.openInvoices}
          </p>
        </article>
        <article className="card">
          <p className="kicker">Members</p>
          <p className="stat" data-testid="members">
            {stats.members}
          </p>
        </article>
      </section>
      <section className="card">
        <h2>Recent activity</h2>
        {activity.length === 0 ? (
          <p>No activity yet.</p>
        ) : (
          <ul className="activity">
            {activity.map((item) => (
              <li key={item.id}>
                <span>{item.summary}</span>
                <span className="muted">
                  {formatDate(item.createdAt)}
                  {item.actor?.name ? ` · ${item.actor.name}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
