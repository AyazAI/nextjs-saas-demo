import { INVOICE_STATUS_LABEL } from "@/domain/labels";
import { formatUsd, invoiceTotalCents } from "@/domain/money";
import { can } from "@/domain/permissions";
import { Flash } from "@/components/flash";
import { requireWorkspace } from "@/lib/context";
import { listClients } from "@/server/clients";
import { listInvoices } from "@/server/invoices";
import Link from "next/link";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { membership } = await requireWorkspace();
  const params = await searchParams;
  const [invoices, clients] = await Promise.all([
    listInvoices(membership.organizationId),
    listClients(membership.organizationId),
  ]);
  const writable = can(membership.role, "invoice:write");
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Invoices</h1>
          <p className="lede">Drafts stay editable. Sent and paid invoices keep their lines.</p>
        </div>
      </header>
      <Flash error={params.error} notice={params.notice} />
      {writable ? (
        clients.length === 0 ? (
          <p>Add a client before creating an invoice.</p>
        ) : (
          <form className="card stack" method="post" action={`/api/orgs/${membership.organizationId}/invoices`}>
            <div className="grid-2">
              <label>
                Client
                <select name="clientId" required defaultValue="">
                  <option value="" disabled>
                    Choose
                  </option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Line description
                <input name="description" required minLength={2} maxLength={200} />
              </label>
              <label>
                Quantity
                <input name="quantity" type="number" min={1} max={1000} defaultValue={1} required />
              </label>
              <label>
                Amount
                <input name="unitAmount" inputMode="decimal" placeholder="150.50" required />
              </label>
              <label>
                Due date
                <input name="dueOn" type="date" />
              </label>
            </div>
            <p className="hint">Amount is dollars and cents, such as 150.50. It is stored as cents.</p>
            <button className="btn primary" type="submit">
              Create invoice
            </button>
          </form>
        )
      ) : (
        <p>Members can view invoices. Owners and admins can create them.</p>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Number</th>
            <th>Client</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={4}>No invoices yet.</td>
            </tr>
          ) : null}
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <Link href={`/app/invoices/${invoice.id}`}>{invoice.number}</Link>
              </td>
              <td>{invoice.client.name}</td>
              <td>
                <span className={`pill ${invoice.status.toLowerCase()}`}>
                  {INVOICE_STATUS_LABEL[invoice.status]}
                </span>
              </td>
              <td>{formatUsd(invoiceTotalCents(invoice.lines))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
