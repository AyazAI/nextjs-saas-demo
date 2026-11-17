import { clientSchema } from "@/domain/schemas";
import { assertCapacity } from "@/domain/plans";
import { prisma } from "@/lib/db";
import type { MembershipContext } from "@/server/access";
import { requireAction } from "@/server/access";
import { recordActivity } from "@/server/activity";
import { HttpError, parseInput, prismaCode } from "@/server/http";
import { usedCount } from "@/server/usage";

export async function listClients(organizationId: string) {
  return prisma.client.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createClient(actor: MembershipContext, raw: Record<string, string>) {
  requireAction(actor.role, "client:write");
  const input = parseInput(clientSchema, raw);
  const used = await usedCount(actor.organizationId, "clients");
  assertCapacity(actor.organization.plan, "clients", used);
  const client = await prisma.client.create({
    data: {
      organizationId: actor.organizationId,
      name: input.name,
      email: input.email,
      company: input.company,
      notes: input.notes,
    },
  });
  await recordActivity(actor.organizationId, actor.userId, "client.create", `Added client ${client.name}`);
  return client;
}

export async function deleteClient(actor: MembershipContext, clientId: string) {
  requireAction(actor.role, "client:write");
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: actor.organizationId },
  });
  if (!client) throw new HttpError(404, "Client not found");
  try {
    await prisma.client.delete({ where: { id: client.id } });
  } catch (error) {
    if (prismaCode(error) === "P2003") {
      throw new HttpError(409, "This client still has invoices");
    }
    throw error;
  }
  await recordActivity(actor.organizationId, actor.userId, "client.delete", `Removed client ${client.name}`);
}
