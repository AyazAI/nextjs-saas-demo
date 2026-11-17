import { requireMember, requireUser } from "@/server/access";
import { startCheckout } from "@/server/billing";
import { HttpError, publicOrigin } from "@/server/http";
import { api } from "@/server/route";

export async function POST(req: Request) {
  return api(req, "/app/billing", async (body) => {
    const user = await requireUser();
    if (!body.organizationId) throw new HttpError(400, "Choose a workspace");
    const membership = await requireMember(body.organizationId, user.id);
    const result = await startCheckout(membership, publicOrigin(req));
    return { redirect: result.url, json: result };
  });
}
