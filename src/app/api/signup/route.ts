import { orgCookie } from "@/server/cookies";
import { signupAccount } from "@/server/signup";
import { api } from "@/server/route";

export async function POST(req: Request) {
  return api(req, "/signup", async (body) => {
    const result = await signupAccount(body);
    return {
      redirect: "/login?notice=account-created",
      cookies: [orgCookie(result.organization.slug)],
      json: { ok: true, organizationId: result.organization.id, slug: result.organization.slug },
    };
  });
}
