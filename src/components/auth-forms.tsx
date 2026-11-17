"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  github,
  initialError,
}: {
  github: boolean;
  initialError: string | null;
}) {
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    if (!result || result.error) {
      setPending(false);
      setError("Invalid email or password");
      return;
    }
    router.refresh();
    router.push("/app");
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {error ? (
        <p className="banner bad" role="alert">
          {error}
        </p>
      ) : null}
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {github ? (
        <button className="btn" type="button" onClick={() => signIn("github", { callbackUrl: "/app" })}>
          Continue with GitHub
        </button>
      ) : null}
    </form>
  );
}

export function SignupForm({
  github,
  initialError,
}: {
  github: boolean;
  initialError: string | null;
}) {
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      organizationName: String(form.get("organizationName") ?? ""),
    };
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setPending(false);
      setError(body?.error ?? "Could not create the workspace");
      return;
    }
    const result = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    if (!result || result.error) {
      router.push("/login?notice=account-created");
      return;
    }
    router.refresh();
    router.push("/app");
  }

  return (
    <form className="stack" method="post" action="/api/signup" onSubmit={onSubmit}>
      {error ? (
        <p className="banner bad" role="alert">
          {error}
        </p>
      ) : null}
      <label>
        Your name
        <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="new-password" required minLength={10} />
      </label>
      <label>
        Workspace name
        <input name="organizationName" required minLength={2} maxLength={80} />
      </label>
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create workspace"}
      </button>
      {github ? (
        <button className="btn" type="button" onClick={() => signIn("github", { callbackUrl: "/app" })}>
          Continue with GitHub
        </button>
      ) : null}
    </form>
  );
}
