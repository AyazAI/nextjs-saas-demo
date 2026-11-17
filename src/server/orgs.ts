import { nextSlug, slugify } from "@/domain/slug";
import { orgNameSchema } from "@/domain/schemas";
import { prisma } from "@/lib/db";
import type { MembershipContext } from "@/server/access";
import { requireAction } from "@/server/access";
import { recordActivity } from "@/server/activity";
import { HttpError, parseInput, prismaCode } from "@/server/http";

export async function createOrganizationForUser(userId: string, name: string) {
  const input = parseInput(orgNameSchema, { name });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const base = slugify(input.name);
    const existing = await prisma.organization.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    const slug = nextSlug(base, new Set(existing.map((row) => row.slug)));
    try {
      return await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: input.name, slug },
        });
        await tx.membership.create({
          data: { organizationId: organization.id, userId, role: "OWNER" },
        });
        await tx.activity.create({
          data: {
            organizationId: organization.id,
            actorId: userId,
            action: "org.create",
            summary: `Created workspace ${organization.name}`.slice(0, 300),
          },
        });
        return organization;
      });
    } catch (error) {
      if (prismaCode(error) === "P2002") continue;
      throw error;
    }
  }
  throw new HttpError(409, "Could not allocate a workspace URL. Try a different name.");
}

export async function renameOrganization(actor: MembershipContext, name: string) {
  requireAction(actor.role, "org:rename");
  const input = parseInput(orgNameSchema, { name });
  const organization = await prisma.organization.update({
    where: { id: actor.organizationId },
    data: { name: input.name },
  });
  await recordActivity(
    organization.id,
    actor.userId,
    "org.rename",
    `Renamed the workspace to ${organization.name}`,
  );
  return organization;
}

export async function deleteOrganization(actor: MembershipContext, confirm: string | undefined) {
  requireAction(actor.role, "org:delete");
  if (confirm?.trim() !== "delete") throw new HttpError(400, "Type delete to confirm");
  const fallback = await prisma.membership.findFirst({
    where: { userId: actor.userId, organizationId: { not: actor.organizationId } },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  await prisma.organization.delete({ where: { id: actor.organizationId } });
  return fallback?.organization.slug ?? null;
}
