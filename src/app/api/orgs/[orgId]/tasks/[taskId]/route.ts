import { requireMember, requireUser } from "@/server/access";
import { api } from "@/server/route";
import { updateTaskStatus } from "@/server/tasks";

type Ctx = { params: Promise<{ orgId: string; taskId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { orgId, taskId } = await ctx.params;
  return api(req, "/app/tasks", async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    await updateTaskStatus(membership, taskId, body);
    return { redirect: "/app/tasks", json: { ok: true } };
  });
}
