import { prisma } from "@/lib/db";
import { requireUser } from "@/server/access";
import { orgCookie } from "@/server/cookies";
import { createOrganizationForUser } from "@/server/orgs";
import { api, jsonRoute } from "@/server/route";

export async function GET() {
  return jsonRoute(async () => {
    const user = await requireUser();
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });
    return {
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        plan: membership.organization.plan,
        role: membership.role,
      })),
    };
  });
}

export async function POST(req: Request) {
  return api(req, "/app", async (body) => {
    const user = await requireUser();
    const organization = await createOrganizationForUser(user.id, body.name ?? "");
    return {
      redirect: "/app",
      cookies: [orgCookie(organization.slug)],
      json: { id: organization.id, name: organization.name, slug: organization.slug },
    };
  });
}
