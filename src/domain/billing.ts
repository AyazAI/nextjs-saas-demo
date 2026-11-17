export type BillingMode = "mock" | "stripe";
export type Plan = "FREE" | "PRO";
export type SubscriptionStatus = "NONE" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export type BillingEnv = {
  BILLING_MODE?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
};

export function resolveBillingMode(env: BillingEnv): BillingMode {
  if (env.BILLING_MODE === "mock") return "mock";
  if (env.BILLING_MODE === "stripe") return "stripe";
  if (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_ID) return "stripe";
  return "mock";
}

export function planFromStripeStatus(status: string): {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
} {
  if (status === "active" || status === "trialing") {
    return { plan: "PRO", subscriptionStatus: "ACTIVE" };
  }
  if (status === "past_due" || status === "unpaid") {
    return { plan: "PRO", subscriptionStatus: "PAST_DUE" };
  }
  return { plan: "FREE", subscriptionStatus: "CANCELED" };
}

export function billingEnvFromProcess(env: NodeJS.ProcessEnv = process.env): BillingEnv {
  return {
    BILLING_MODE: env.BILLING_MODE,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: env.STRIPE_PRICE_ID,
  };
}
