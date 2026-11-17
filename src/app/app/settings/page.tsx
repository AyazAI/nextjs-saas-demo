import { ROLE_LABEL } from "@/domain/labels";
import { can, type Role } from "@/domain/permissions";
import { Flash } from "@/components/flash";
import { requireWorkspace } from "@/lib/context";
import { listMembers } from "@/server/members";

const ROLE_OPTIONS: Role[] = ["OWNER", "ADMIN", "MEMBER"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { membership } = await requireWorkspace();
  const params = await searchParams;
  const members = await listMembers(membership.organizationId);
  const ownerCount = members.filter((member) => member.role === "OWNER").length;
  const inviteRoles = membership.role === "OWNER" ? ROLE_OPTIONS : ROLE_OPTIONS.filter((role) => role !== "OWNER");
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Members</h1>
          <p className="lede">Invites need an existing account. This demo does not send email.</p>
        </div>
      </header>
      <Flash error={params.error} notice={params.notice} />
      {can(membership.role, "org:rename") ? (
        <form className="card stack" method="post" action={`/api/orgs/${membership.organizationId}`}>
          <label>
            Workspace name
            <input name="name" defaultValue={membership.organization.name} required minLength={2} maxLength={80} />
          </label>
          <button className="btn" type="submit">
            Save name
          </button>
        </form>
      ) : null}
      {can(membership.role, "member:invite") ? (
        <form className="card stack" method="post" action={`/api/orgs/${membership.organizationId}/members`}>
          <div className="grid-2">
            <label>
              Invite email
              <input name="email" type="email" required />
            </label>
            <label>
              Invite role
              <select name="role" defaultValue="MEMBER">
                {inviteRoles.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="btn primary" type="submit">
            Invite
          </button>
        </form>
      ) : (
        <p>Only an owner or admin can change members.</p>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Role</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const locked =
              !can(membership.role, "member:update") ||
              (membership.role === "ADMIN" && member.role === "OWNER") ||
              (member.role === "OWNER" && ownerCount < 2);
            return (
              <tr key={member.id}>
                <td>
                  <strong>{member.user.name}</strong>
                  <div className="muted">{member.user.email}</div>
                </td>
                <td>
                  {locked ? (
                    ROLE_LABEL[member.role]
                  ) : (
                    <form method="post" action={`/api/orgs/${membership.organizationId}/members/${member.id}`}>
                      <label>
                        Role for {member.user.name}
                        <select name="role" defaultValue={member.role}>
                          {(membership.role === "OWNER" ? ROLE_OPTIONS : inviteRoles).map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABEL[role]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="btn" type="submit">
                        Save role
                      </button>
                    </form>
                  )}
                </td>
                <td>
                  {can(membership.role, "member:update") && !locked ? (
                    <form method="post" action={`/api/orgs/${membership.organizationId}/members/${member.id}`}>
                      <input type="hidden" name="_action" value="delete" />
                      <button className="btn danger" type="submit" aria-label={`Remove ${member.user.name}`}>
                        Remove
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {can(membership.role, "org:delete") ? (
        <form className="card stack danger-zone" method="post" action={`/api/orgs/${membership.organizationId}`}>
          <h2>Delete workspace</h2>
          <p>This removes clients, tasks, and invoices for this organization.</p>
          <label>
            Type delete to confirm
            <input name="confirm" autoComplete="off" />
          </label>
          <input type="hidden" name="_action" value="delete" />
          <button className="btn danger" type="submit">
            Delete workspace
          </button>
        </form>
      ) : null}
    </>
  );
}
