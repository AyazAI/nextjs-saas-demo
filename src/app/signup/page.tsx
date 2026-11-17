import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { safeQueryMessage } from "@/domain/text";
import { authOptions, githubEnabled } from "@/lib/auth";
import { SignupForm } from "@/components/auth-forms";
import { Brand } from "@/components/brand";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create workspace" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/app");
  const params = await searchParams;
  return (
    <main className="auth-layout" id="main">
      <section className="auth-card">
        <Brand />
        <h1>Create a workspace</h1>
        <p className="lede">You become the owner. You can invite people who already have an account.</p>
        <SignupForm github={githubEnabled()} initialError={safeQueryMessage(params.error)} />
      </section>
      <aside className="auth-card">
        <h2>What you get</h2>
        <p>A Free plan with room for a few members, clients, tasks, and invoices.</p>
        <p>Upgrade is a Stripe test checkout, or a local mock when Stripe keys are not set.</p>
        <p>This form stores a password hash. It does not send email.</p>
      </aside>
    </main>
  );
}
