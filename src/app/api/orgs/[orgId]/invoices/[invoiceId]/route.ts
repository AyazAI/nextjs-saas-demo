import { requireMember, requireUser } from "@/server/access";
import { HttpError } from "@/server/http";
import { getInvoice, updateInvoice } from "@/server/invoices";
import { api, jsonRoute } from "@/server/route";

type Ctx = { params: Promise<{ orgId: string; invoiceId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { orgId, invoiceId } = await ctx.params;
  return jsonRoute(async () => {
    const user = await requireUser();
    await requireMember(orgId, user.id);
    const invoice = await getInvoice(orgId, invoiceId);
    if (!invoice) throw new HttpError(404, "Invoice not found");
    return { invoice };
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { orgId, invoiceId } = await ctx.params;
  return api(req, `/app/invoices/${invoiceId}`, async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    const result = await updateInvoice(membership, invoiceId, body);
    if (result.deleted) return { redirect: "/app/invoices", json: { ok: true } };
    return { redirect: `/app/invoices/${invoiceId}`, json: { ok: true } };
  });
}
