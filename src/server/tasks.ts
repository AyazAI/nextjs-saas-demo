import { TASK_STATUS_LABEL } from "@/domain/labels";
import { parseIsoDate } from "@/domain/dates";
import { assertCapacity, opensTaskSlot } from "@/domain/plans";
import { taskCreateSchema, taskStatusSchema } from "@/domain/schemas";
import { prisma } from "@/lib/db";
import type { MembershipContext } from "@/server/access";
import { requireAction } from "@/server/access";
import { recordActivity } from "@/server/activity";
import { HttpError, parseInput } from "@/server/http";
import { usedCount } from "@/server/usage";

const taskInclude = {
  client: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;

async function assertClient(organizationId: string, clientId: string | undefined) {
  if (!clientId) return null;
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId },
    select: { id: true },
  });
  if (!client) throw new HttpError(400, "Choose a client in this workspace");
  return client.id;
}

async function assertAssignee(organizationId: string, assigneeId: string | undefined) {
  if (!assigneeId) return null;
  const membership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId: assigneeId } },
    select: { userId: true },
  });
  if (!membership) throw new HttpError(400, "Assignee must be a member of this workspace");
  return membership.userId;
}

function readDate(value: string | undefined) {
  try {
    return parseIsoDate(value);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid date");
  }
}

export async function listTasks(organizationId: string) {
  return prisma.task.findMany({
    where: { organizationId },
    include: taskInclude,
    orderBy: [{ dueOn: "asc" }, { createdAt: "asc" }],
  });
}

export async function createTask(actor: MembershipContext, raw: Record<string, string>) {
  requireAction(actor.role, "task:write");
  const input = parseInput(taskCreateSchema, raw);
  if (opensTaskSlot(null, input.status)) {
    const used = await usedCount(actor.organizationId, "openTasks");
    assertCapacity(actor.organization.plan, "openTasks", used);
  }
  const task = await prisma.task.create({
    data: {
      organizationId: actor.organizationId,
      title: input.title,
      description: input.description,
      status: input.status,
      clientId: await assertClient(actor.organizationId, input.clientId),
      assigneeId: await assertAssignee(actor.organizationId, input.assigneeId),
      dueOn: readDate(input.dueOn),
    },
  });
  await recordActivity(actor.organizationId, actor.userId, "task.create", `Added task “${task.title}”`);
  return task;
}

export async function updateTaskStatus(
  actor: MembershipContext,
  taskId: string,
  raw: Record<string, string>,
) {
  requireAction(actor.role, "task:write");
  if (raw._action === "delete") {
    await deleteTask(actor, taskId);
    return;
  }
  const input = parseInput(taskStatusSchema, raw);
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: actor.organizationId },
  });
  if (!task) throw new HttpError(404, "Task not found");
  if (opensTaskSlot(task.status, input.status)) {
    const used = await usedCount(actor.organizationId, "openTasks");
    assertCapacity(actor.organization.plan, "openTasks", used);
  }
  await prisma.task.update({ where: { id: task.id }, data: { status: input.status } });
  if (task.status !== input.status) {
    await recordActivity(
      actor.organizationId,
      actor.userId,
      "task.status",
      `Moved “${task.title}” to ${TASK_STATUS_LABEL[input.status]}`,
    );
  }
}

export async function deleteTask(actor: MembershipContext, taskId: string) {
  requireAction(actor.role, "task:write");
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: actor.organizationId },
  });
  if (!task) throw new HttpError(404, "Task not found");
  await prisma.task.delete({ where: { id: task.id } });
  await recordActivity(actor.organizationId, actor.userId, "task.delete", `Removed task “${task.title}”`);
}
