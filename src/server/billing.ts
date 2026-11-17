import Stripe from "stripe";
import { billingEnvFromProcess, planFromStripeStatus, resolveBillingMode } from "@/domain/billing";
import { PLAN_LABEL } from "@/domain/labels";
import { prisma } from "@/lib/db";
import type { MembershipContext } from "@/server/access";
import { requireAction } from "@/server/access";
import { recordActivity } from "@/server/activity";
import { HttpError, prismaCode } from "@/server/http";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, "STRIPE_SECRET_KEY is not set");
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2026-10-28.endive" });
  }
  return stripeClient;
}

function stripeId(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

export async function startCheckout(actor: MembershipContext, origin: string) {
  requireAction(actor.role, "billing:manage");
  const mode = resolveBillingMode(billingEnvFromProcess());
  if (mode === "mock") {
    return { mode: "mock" as const, url: "/app/billing?notice=mock-ready" };
  }
  const price = process.env.STRIPE_PRICE_ID;
  if (!process.env.STRIPE_SECRET_KEY || !price) {
    throw new HttpError(
      503,
      "Stripe test mode is selected, but STRIPE_SECRET_KEY or STRIPE_PRICE_ID is missing",
    );
  }
  const stripe = getStripe();
  let customerId = actor.organization.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: actor.user.email,
      name: actor.organization.name,
      metadata: { organizationId: actor.organizationId },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: actor.organizationId },
      data: { stripeCustomerId: customerId },
    });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/app/billing?notice=checkout-success`,
    cancel_url: `${origin}/app/billing?notice=checkout-cancel`,
    client_reference_id: actor.organizationId,
    metadata: { organizationId: actor.organizationId },
    subscription_data: { metadata: { organizationId: actor.organizationId } },
  });
  if (!session.url) throw new HttpError(502, "Stripe did not return a checkout URL");
  return { mode: "stripe" as const, url: session.url };
}

export async function setMockPlan(actor: MembershipContext, plan: "FREE" | "PRO") {
  requireAction(actor.role, "billing:manage");
  if (resolveBillingMode(billingEnvFromProcess()) !== "mock") {
    throw new HttpError(403, "Mock activation is disabled while Stripe billing is configured");
  }
  const organization = await prisma.organization.update({
    where: { id: actor.organizationId },
    data: {
      plan,
      subscriptionStatus: plan === "PRO" ? "ACTIVE" : "CANCELED",
    },
  });
  await recordActivity(
    actor.organizationId,
    actor.userId,
    "billing.mock",
    plan === "PRO"
      ? "Activated Pro with the local mock. No card was charged."
      : "Returned the workspace to the Free plan in the local mock.",
  );
  return organization;
}

export async function applyStripeEvent(event: Stripe.Event): Promise<{ duplicate: boolean }> {
  const existing = await prisma.billingEvent.findUnique({ where: { stripeEventId: event.id } });
  if (existing) return { duplicate: true };

  let organizationId: string | null = null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    organizationId = session.metadata?.organizationId ?? null;
    if (organizationId) {
      const paid =
        session.payment_status === "paid" || session.payment_status === "no_payment_required";
      await prisma.organization.updateMany({
        where: { id: organizationId },
        data: {
          ...(stripeId(session.customer) ? { stripeCustomerId: stripeId(session.customer) } : {}),
          ...(stripeId(session.subscription)
            ? { stripeSubscriptionId: stripeId(session.subscription) }
            : {}),
          ...(paid ? { plan: "PRO", subscriptionStatus: "ACTIVE" } : {}),
        },
      });
      if (paid) {
        await recordActivity(
          organizationId,
          null,
          "billing.stripe",
          "Stripe test checkout completed. Plan set to Pro.",
        );
      }
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const mapped = planFromStripeStatus(
      event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
    );
    const metadataOrg = subscription.metadata?.organizationId;
    const organization = await prisma.organization.findFirst({
      where: metadataOrg ? { id: metadataOrg } : { stripeSubscriptionId: subscription.id },
      select: { id: true },
    });
    if (organization) {
      organizationId = organization.id;
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          plan: mapped.plan,
          subscriptionStatus: mapped.subscriptionStatus,
          stripeSubscriptionId: subscription.id,
          ...(stripeId(subscription.customer)
            ? { stripeCustomerId: stripeId(subscription.customer) }
            : {}),
        },
      });
      await recordActivity(
        organization.id,
        null,
        "billing.stripe",
        `Stripe set the plan to ${PLAN_LABEL[mapped.plan]}.`,
      );
    }
  }

  try {
    await prisma.billingEvent.create({
      data: { stripeEventId: event.id, type: event.type, organizationId },
    });
  } catch (error) {
    if (prismaCode(error) === "P2002") return { duplicate: true };
    throw error;
  }
  return { duplicate: false };
}
