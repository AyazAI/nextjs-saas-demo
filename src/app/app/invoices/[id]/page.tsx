import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, INVOICE_STATUS_LABEL } from "@/domain/labels";
import { invoiceCanBeDeleted, linesAreEditable, nextStatuses } from "@/domain/invoices";
import { formatUsd, invoiceTotalCents, lineTotalCents } from "@/domain/money";
import { can } from "@/domain/permissions";
import { Flash } from "@/components/flash";
import { requireWorkspace } from "@/lib/context";
import { getInvoice } from "@/server/invoices";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { membership } = await requireWorkspace();
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getInvoice(membership.organizationId, id);
  if (!invoice) notFound();
  const writable = can(membership.role, "invoice:write");
  const total = invoiceTotalCents(invoice.lines);
  const action = `/api/orgs/${membership.organizationId}/invoices/${invoice.id}`;
  return (
    <>
      <p>
        <Link href="/app/invoices">All invoices</Link>
      </p>
      <Flash error={query.error} notice={query.notice} />
      <article className="sheet card">
        <div className="sheet-top">
          <div>
            <p className="kicker">{membership.organization.name}</p>
            <h1 className="sheet-title">{invoice.number}</h1>
            <p>
              <span className={`pill ${invoice.status.toLowerCase()}`}>
                {INVOICE_STATUS_LABEL[invoice.status]}
              </span>
            </p>
          </div>
          <div>
            <p>Issued {formatDate(invoice.issuedOn)}</p>
            <p>Due {formatDate(invoice.dueOn)}</p>
            <p>
              Bill to
              <br />
              <strong>{invoice.client.name}</strong>
              {invoice.client.company && invoice.client.company !== invoice.client.name ? (
                <>
                  <br />
                  {invoice.client.company}
                </>
              ) : null}
            </p>
          </div>
        </div>
        <table className="sheet-lines">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.description}</td>
                <td>{line.quantity}</td>
                <td>{formatUsd(line.unitAmountCents)}</td>
                <td>{formatUsd(lineTotalCents(line.quantity, line.unitAmountCents))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="total-row">
          <span>Total</span>
          <strong>{formatUsd(total)}</strong>
        </div>
        {invoice.notes ? <p>{invoice.notes}</p> : null}
      </article>
      {writable ? (
        <div className="stack" style={{ marginTop: 16 }}>
          <div className="row-actions">
            {nextStatuses(invoice.status).map((status) => (
              <form key={status} method="post" action={action}>
                <input type="hidden" name="status" value={status} />
                <button className="btn" type="submit">
                  Mark {INVOICE_STATUS_LABEL[status]}
                </button>
              </form>
            ))}
            {invoiceCanBeDeleted(invoice.status) ? (
              <form method="post" action={action}>
                <input type="hidden" name="_action" value="delete" />
                <button className="btn danger" type="submit">
                  Delete draft
                </button>
              </form>
            ) : null}
          </div>
          {linesAreEditable(invoice.status) ? (
            <form className="card grid-2" method="post" action={`${action}/lines`}>
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
                <input name="unitAmount" inputMode="decimal" required />
              </label>
              <button className="btn" type="submit">
                Add line
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
