import { requireMember, requireUser } from "@/server/access";
import { updateMember } from "@/server/members";
import { api } from "@/server/route";

type Ctx = { params: Promise<{ orgId: string; membershipId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { orgId, membershipId } = await ctx.params;
  return api(req, "/app/settings", async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    await updateMember(membership, membershipId, body);
    return { redirect: "/app/settings", json: { ok: true } };
  });
}
