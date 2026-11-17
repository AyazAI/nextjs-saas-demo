import { can } from "@/domain/permissions";
import { Flash } from "@/components/flash";
import { requireWorkspace } from "@/lib/context";
import { listClients } from "@/server/clients";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { membership } = await requireWorkspace();
  const params = await searchParams;
  const clients = await listClients(membership.organizationId);
  const writable = can(membership.role, "client:write");
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="lede">People and companies this workspace bills.</p>
        </div>
      </header>
      <Flash error={params.error} notice={params.notice} />
      {writable ? (
        <form className="card stack" method="post" action={`/api/orgs/${membership.organizationId}/clients`}>
          <div className="grid-2">
            <label>
              Client name
              <input name="name" required minLength={2} maxLength={120} />
            </label>
            <label>
              Company
              <input name="company" maxLength={120} />
            </label>
            <label>
              Email
              <input name="email" type="email" />
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" maxLength={2000} />
          </label>
          <button className="btn primary" type="submit">
            Add client
          </button>
        </form>
      ) : (
        <p>Members can view clients. Owners and admins can add them.</p>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Email</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr>
              <td colSpan={4}>No clients yet.</td>
            </tr>
          ) : null}
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.name}</td>
              <td>{client.company ?? "—"}</td>
              <td>{client.email ?? "—"}</td>
              <td>
                {writable ? (
                  <form method="post" action={`/api/orgs/${membership.organizationId}/clients/${client.id}`}>
                    <input type="hidden" name="_action" value="delete" />
                    <button className="btn danger" type="submit" aria-label={`Delete ${client.name}`}>
                      Delete
                    </button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
