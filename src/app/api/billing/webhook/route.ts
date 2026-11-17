import { NextResponse } from "next/server";
import Stripe from "stripe";
import { billingEnvFromProcess, resolveBillingMode } from "@/domain/billing";
import { applyStripeEvent, getStripe } from "@/server/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (resolveBillingMode(billingEnvFromProcess()) !== "stripe") {
    return NextResponse.json({ error: "Stripe webhooks are disabled in mock billing mode" }, { status: 404 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe test webhook is not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }
  const payload = await req.text();
  try {
    const event = getStripe().webhooks.constructEvent(payload, signature, secret);
    const result = await applyStripeEvent(event);
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    console.error("Stripe webhook rejected");
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
    }
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
