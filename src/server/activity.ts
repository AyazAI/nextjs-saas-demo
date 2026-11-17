import { prisma } from "@/lib/db";

export async function recordActivity(
  organizationId: string,
  actorId: string | null,
  action: string,
  summary: string,
) {
  await prisma.activity.create({
    data: {
      organizationId,
      actorId,
      action,
      summary: summary.slice(0, 300),
    },
  });
}
