import { requireMember, requireUser } from "@/server/access";
import { createClient, listClients } from "@/server/clients";
import { api, jsonRoute } from "@/server/route";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return jsonRoute(async () => {
    const user = await requireUser();
    await requireMember(orgId, user.id);
    return { clients: await listClients(orgId) };
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return api(req, "/app/clients", async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    const client = await createClient(membership, body);
    return { redirect: "/app/clients", json: { id: client.id, name: client.name } };
  });
}
