import { requireMember, requireUser } from "@/server/access";
import { createInvoice, listInvoices } from "@/server/invoices";
import { api, jsonRoute } from "@/server/route";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return jsonRoute(async () => {
    const user = await requireUser();
    await requireMember(orgId, user.id);
    return { invoices: await listInvoices(orgId) };
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return api(req, "/app/invoices", async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    const invoice = await createInvoice(membership, body);
    return {
      redirect: `/app/invoices/${invoice.id}`,
      json: { id: invoice.id, number: invoice.number },
    };
  });
}
