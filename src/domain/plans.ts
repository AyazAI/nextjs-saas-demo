export type Plan = "FREE" | "PRO";
export type LimitResource = "members" | "clients" | "openTasks" | "invoices";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export const PLAN_LIMITS: Record<Plan, Record<LimitResource, number>> = {
  FREE: { members: 3, clients: 5, openTasks: 8, invoices: 5 },
  PRO: { members: 25, clients: 100, openTasks: 500, invoices: 500 },
};

export const LIMIT_LABEL: Record<LimitResource, string> = {
  members: "members",
  clients: "clients",
  openTasks: "open tasks",
  invoices: "invoices (void invoices do not count)",
};

export function limitMessage(plan: Plan, resource: LimitResource, limit: number): string {
  const label = LIMIT_LABEL[resource];
  if (plan === "FREE") {
    return `The Free plan includes ${limit} ${label}. Pro raises this limit.`;
  }
  return `This workspace has reached the Pro limit of ${limit} ${label}.`;
}

export class LimitError extends Error {
  constructor(
    public plan: Plan,
    public resource: LimitResource,
    public limit: number,
  ) {
    super(limitMessage(plan, resource, limit));
    this.name = "LimitError";
  }
}

export function assertCapacity(plan: Plan, resource: LimitResource, used: number): void {
  const limit = PLAN_LIMITS[plan][resource];
  if (used >= limit) throw new LimitError(plan, resource, limit);
}

export function opensTaskSlot(previous: TaskStatus | null, next: TaskStatus): boolean {
  const willBeOpen = next !== "DONE";
  if (previous === null) return willBeOpen;
  const wasOpen = previous !== "DONE";
  return !wasOpen && willBeOpen;
}
