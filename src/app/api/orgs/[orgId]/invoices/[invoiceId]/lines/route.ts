import { requireMember, requireUser } from "@/server/access";
import { addInvoiceLine } from "@/server/invoices";
import { api } from "@/server/route";

type Ctx = { params: Promise<{ orgId: string; invoiceId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { orgId, invoiceId } = await ctx.params;
  return api(req, `/app/invoices/${invoiceId}`, async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    await addInvoiceLine(membership, invoiceId, body);
    return { redirect: `/app/invoices/${invoiceId}`, json: { ok: true } };
  });
}
