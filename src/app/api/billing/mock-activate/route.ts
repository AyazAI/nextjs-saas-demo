import { requireMember, requireUser } from "@/server/access";
import { setMockPlan } from "@/server/billing";
import { HttpError } from "@/server/http";
import { api } from "@/server/route";

export async function POST(req: Request) {
  return api(req, "/app/billing", async (body) => {
    const user = await requireUser();
    if (!body.organizationId) throw new HttpError(400, "Choose a workspace");
    const membership = await requireMember(body.organizationId, user.id);
    await setMockPlan(membership, "PRO");
    return { redirect: "/app/billing?notice=mock-pro", json: { plan: "PRO" } };
  });
}
