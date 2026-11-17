import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/domain/demo";
import { ROLE_LABEL } from "@/domain/labels";
import { safeQueryMessage } from "@/domain/text";
import { authOptions, githubEnabled } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LoginForm } from "@/components/auth-forms";
import { Brand } from "@/components/brand";
import { Flash } from "@/components/flash";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in" };

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  OAuthAccountNotLinked: "That email is already used with a different sign-in method",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/app");
  const params = await searchParams;
  const demo = await prisma.user.findUnique({
    where: { email: DEMO_ACCOUNTS[0].email },
    select: { id: true },
  });
  const initialError =
    safeQueryMessage(params.error && AUTH_ERRORS[params.error] ? AUTH_ERRORS[params.error] : params.error) ??
    null;

  return (
    <main className="auth-layout" id="main">
      <section className="auth-card">
        <Brand />
        <h1>Sign in</h1>
        <Flash notice={params.notice} />
        <LoginForm github={githubEnabled()} initialError={initialError} />
      </section>
      {demo ? (
        <aside className="auth-card">
          <p className="kicker">Seeded database</p>
          <h2>Sample accounts</h2>
          <p>These people are fictional. They exist only after the database seed runs.</p>
          <ul className="activity">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <span>{ROLE_LABEL[account.role]}</span>
                <span>{account.email}</span>
              </li>
            ))}
          </ul>
          <p>
            Password <code>{DEMO_PASSWORD}</code>
          </p>
        </aside>
      ) : (
        <aside className="auth-card">
          <h2>No sample accounts yet</h2>
          <p>Run the database seed, or create a workspace. This demo does not ship with a shared password until then.</p>
        </aside>
      )}
    </main>
  );
}
