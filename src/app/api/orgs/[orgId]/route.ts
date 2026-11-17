import { requireMember, requireUser } from "@/server/access";
import { clearOrgCookie, orgCookie } from "@/server/cookies";
import { deleteOrganization, renameOrganization } from "@/server/orgs";
import { api } from "@/server/route";

type Ctx = { params: Promise<{ orgId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return api(req, "/app/settings", async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    if (body._action === "delete") {
      const slug = await deleteOrganization(membership, body.confirm);
      return {
        redirect: "/app",
        cookies: [slug ? orgCookie(slug) : clearOrgCookie()],
        json: { ok: true },
      };
    }
    const organization = await renameOrganization(membership, body.name ?? "");
    return { redirect: "/app/settings", json: { id: organization.id, name: organization.name } };
  });
}
