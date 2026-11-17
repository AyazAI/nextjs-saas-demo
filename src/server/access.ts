import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Action, Role } from "@/domain/permissions";
import { can } from "@/domain/permissions";
import { HttpError } from "@/server/http";

const membershipInclude = {
  organization: true,
  user: { select: { id: true, name: true, email: true, image: true } },
} satisfies Prisma.MembershipInclude;

export type MembershipContext = Prisma.MembershipGetPayload<{ include: typeof membershipInclude }>;

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new HttpError(401, "Sign in required");
  return session.user;
}

export async function requireMember(organizationId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: membershipInclude,
  });
  if (!membership) throw new HttpError(403, "You are not a member of this workspace");
  return membership;
}

export function requireAction(role: Role, action: Action): void {
  if (can(role, action)) return;
  if (action === "billing:manage") throw new HttpError(403, "Only an owner can change the plan");
  if (action === "invoice:write") {
    throw new HttpError(403, "Only an owner or admin can change invoices");
  }
  if (action === "client:write") throw new HttpError(403, "Only an owner or admin can change clients");
  if (action === "member:invite" || action === "member:update") {
    throw new HttpError(403, "Only an owner or admin can change members");
  }
  throw new HttpError(403, "You do not have permission to do that");
}
