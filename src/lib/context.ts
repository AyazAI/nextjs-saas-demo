import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { cache } from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ORG_COOKIE } from "@/server/cookies";

const membershipInclude = {
  organization: true,
  user: { select: { id: true, name: true, email: true, image: true } },
} as const;

export const loadContext = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { session: null, memberships: [], membership: null };
  }
  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: membershipInclude,
    orderBy: { createdAt: "asc" },
  });
  const jar = await cookies();
  const slug = jar.get(ORG_COOKIE)?.value;
  const membership =
    memberships.find((item) => item.organization.slug === slug) ?? memberships[0] ?? null;
  return { session, memberships, membership };
});

export async function requireWorkspace() {
  const context = await loadContext();
  if (!context.session?.user?.id) redirect("/login");
  if (!context.membership) redirect("/app");
  return {
    session: context.session,
    memberships: context.memberships,
    membership: context.membership,
  };
}
