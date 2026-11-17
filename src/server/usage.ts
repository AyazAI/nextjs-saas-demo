import type { LimitResource } from "@/domain/plans";
import { prisma } from "@/lib/db";

export async function usedCount(organizationId: string, resource: LimitResource): Promise<number> {
  if (resource === "members") {
    return prisma.membership.count({ where: { organizationId } });
  }
  if (resource === "clients") {
    return prisma.client.count({ where: { organizationId } });
  }
  if (resource === "openTasks") {
    return prisma.task.count({ where: { organizationId, status: { not: "DONE" } } });
  }
  return prisma.invoice.count({ where: { organizationId, status: { not: "VOID" } } });
}

export async function workspaceStats(organizationId: string) {
  const [members, clients, openTasks, openInvoices] = await Promise.all([
    usedCount(organizationId, "members"),
    usedCount(organizationId, "clients"),
    usedCount(organizationId, "openTasks"),
    prisma.invoice.count({ where: { organizationId, status: { in: ["DRAFT", "SENT"] } } }),
  ]);
  return { members, clients, openTasks, openInvoices };
}
