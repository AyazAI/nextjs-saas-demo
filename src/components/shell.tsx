import type { ReactNode } from "react";
import { SAMPLE_ORG_SLUG } from "@/domain/demo";
import { ROLE_LABEL } from "@/domain/labels";
import { initials } from "@/domain/labels";
import type { loadContext } from "@/lib/context";
import { Brand } from "@/components/brand";
import { SideNav } from "@/components/nav";
import { SignOutButton } from "@/components/sign-out";

type Context = Awaited<ReturnType<typeof loadContext>>;

export function Shell({
  context,
  children,
}: {
  context: Context & { membership: NonNullable<Context["membership"]> };
  children: ReactNode;
}) {
  const { membership, memberships, session } = context;
  const organization = membership.organization;
  const user = session?.user;
  return (
    <div className="shell" data-org-id={organization.id}>
      <aside className="rail">
        <Brand href="/app" />
        {memberships.length > 1 ? (
          <form className="switcher" method="post" action="/api/session/org">
            <label>
              Workspace
              <select name="slug" defaultValue={organization.slug} aria-label="Workspace">
                {memberships.map((item) => (
                  <option key={item.id} value={item.organization.slug}>
                    {item.organization.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn quiet" type="submit">
              Switch
            </button>
          </form>
        ) : (
          <p className="rail-org">{organization.name}</p>
        )}
        <p className="rail-role">{ROLE_LABEL[membership.role]}</p>
        <SideNav />
        <div className="rail-foot">
          <div className="person">
            <span className="avatar" aria-hidden="true">
              {initials(user?.name ?? user?.email ?? "?")}
            </span>
            <div>
              <p className="rail-org">{user?.name}</p>
              <p className="rail-user">{user?.email}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <div className="workspace">
        {organization.slug === SAMPLE_ORG_SLUG ? (
          <p className="banner info">
            Sample Studio is fictional seed data for this portfolio demo. It is not a customer.
          </p>
        ) : null}
        <main id="main">{children}</main>
      </div>
    </div>
  );
}

export function Gate({ name, error }: { name: string; error?: string }) {
  return (
    <main className="gate" id="main">
      <Brand />
      <h1>Create a workspace</h1>
      <p>{name}, your account is not in a workspace yet.</p>
      {error ? (
        <p className="banner bad" role="alert">
          {error}
        </p>
      ) : null}
      <form className="card stack" method="post" action="/api/orgs">
        <label>
          Workspace name
          <input name="name" required minLength={2} maxLength={80} />
        </label>
        <button className="btn primary" type="submit">
          Create workspace
        </button>
      </form>
      <SignOutButton />
    </main>
  );
}
