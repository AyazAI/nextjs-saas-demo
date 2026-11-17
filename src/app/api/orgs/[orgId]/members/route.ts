import { requireMember, requireUser } from "@/server/access";
import { inviteMember, listMembers } from "@/server/members";
import { api, jsonRoute } from "@/server/route";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return jsonRoute(async () => {
    const user = await requireUser();
    await requireMember(orgId, user.id);
    return { members: await listMembers(orgId) };
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return api(req, "/app/settings", async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    await inviteMember(membership, body);
    return { redirect: "/app/settings", json: { ok: true } };
  });
}
