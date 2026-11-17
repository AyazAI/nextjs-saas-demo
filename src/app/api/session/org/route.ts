import { slugSchema } from "@/domain/schemas";
import { prisma } from "@/lib/db";
import { requireUser } from "@/server/access";
import { orgCookie } from "@/server/cookies";
import { HttpError, parseInput } from "@/server/http";
import { api } from "@/server/route";

export async function POST(req: Request) {
  return api(req, "/app", async (body) => {
    const user = await requireUser();
    const input = parseInput(slugSchema, body);
    const membership = await prisma.membership.findFirst({
      where: { userId: user.id, organization: { slug: input.slug } },
      include: { organization: true },
    });
    if (!membership) throw new HttpError(403, "You are not a member of that workspace");
    return {
      redirect: "/app",
      cookies: [orgCookie(membership.organization.slug)],
      json: { ok: true, slug: membership.organization.slug },
    };
  });
}
