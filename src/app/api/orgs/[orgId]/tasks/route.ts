import { requireMember, requireUser } from "@/server/access";
import { api, jsonRoute } from "@/server/route";
import { createTask, listTasks } from "@/server/tasks";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return jsonRoute(async () => {
    const user = await requireUser();
    await requireMember(orgId, user.id);
    return { tasks: await listTasks(orgId) };
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  return api(req, "/app/tasks", async (body) => {
    const user = await requireUser();
    const membership = await requireMember(orgId, user.id);
    const task = await createTask(membership, body);
    return { redirect: "/app/tasks", json: { id: task.id, title: task.title } };
  });
}
