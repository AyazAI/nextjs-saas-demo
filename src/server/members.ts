import { ROLE_LABEL } from "@/domain/labels";
import { inviteRoleError, memberChangeError } from "@/domain/permissions";
import { inviteSchema, memberUpdateSchema } from "@/domain/schemas";
import { assertCapacity } from "@/domain/plans";
import { prisma } from "@/lib/db";
import type { MembershipContext } from "@/server/access";
import { recordActivity } from "@/server/activity";
import { HttpError, parseInput } from "@/server/http";
import { usedCount } from "@/server/usage";

const memberSelect = {
  id: true,
  role: true,
  userId: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

export async function listMembers(organizationId: string) {
  return prisma.membership.findMany({
    where: { organizationId },
    select: memberSelect,
    orderBy: { createdAt: "asc" },
  });
}

export async function inviteMember(actor: MembershipContext, raw: Record<string, string>) {
  const input = parseInput(inviteSchema, raw);
  const roleError = inviteRoleError(actor.role, input.role);
  if (roleError) throw new HttpError(403, roleError);
  const used = await usedCount(actor.organizationId, "members");
  assertCapacity(actor.organization.plan, "members", used);
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    throw new HttpError(404, "No account with that email. This demo does not send invite email.");
  }
  const existing = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId: actor.organizationId, userId: user.id } },
  });
  if (existing) throw new HttpError(409, "That person is already a member");
  await prisma.membership.create({
    data: { organizationId: actor.organizationId, userId: user.id, role: input.role },
  });
  await recordActivity(
    actor.organizationId,
    actor.userId,
    "member.invite",
    `Invited ${user.name} as ${ROLE_LABEL[input.role]}`,
  );
}

export async function updateMember(
  actor: MembershipContext,
  membershipId: string,
  raw: Record<string, string>,
) {
  const input = parseInput(memberUpdateSchema, raw);
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: actor.organizationId },
    select: memberSelect,
  });
  if (!target) throw new HttpError(404, "Member not found");
  const ownerCount = await prisma.membership.count({
    where: { organizationId: actor.organizationId, role: "OWNER" },
  });
  const actorRef = { id: actor.id, userId: actor.userId, role: actor.role };
  const targetRef = { id: target.id, userId: target.userId, role: target.role };
  if (raw._action === "delete") {
    const message = memberChangeError({
      actor: actorRef,
      target: targetRef,
      remove: true,
      ownerCount,
    });
    if (message) throw new HttpError(403, message);
    await prisma.membership.delete({ where: { id: target.id } });
    await recordActivity(actor.organizationId, actor.userId, "member.remove", `Removed ${target.user.name}`);
    return;
  }
  if (!input.role) throw new HttpError(400, "Choose a role");
  const message = memberChangeError({
    actor: actorRef,
    target: targetRef,
    nextRole: input.role,
    ownerCount,
  });
  if (message) throw new HttpError(403, message);
  if (input.role === target.role) return;
  await prisma.membership.update({ where: { id: target.id }, data: { role: input.role } });
  await recordActivity(
    actor.organizationId,
    actor.userId,
    "member.role",
    `Changed ${target.user.name} to ${ROLE_LABEL[input.role]}`,
  );
}
