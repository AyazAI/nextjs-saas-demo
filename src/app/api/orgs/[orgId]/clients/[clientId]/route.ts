import { requireMember, requireUser } from "@/server/access";
import { deleteClient } from "@/server/clients";
import { api } from "@/server/route";

type Ctx = { params: Promise<{ orgId: string; clientId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { orgId, clientId } = await ctx.params;
  return api(req, "/app/clients", async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    if (body._action !== "delete") {
      return { redirect: "/app/clients", json: { ok: true } };
    }
    await deleteClient(membership, clientId);
    return { redirect: "/app/clients", json: { ok: true } };
  });
}
