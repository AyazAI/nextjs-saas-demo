export type Role = "OWNER" | "ADMIN" | "MEMBER";

export const ACTIONS = [
  "org:rename",
  "org:delete",
  "member:invite",
  "member:update",
  "billing:manage",
  "client:write",
  "task:write",
  "invoice:write",
] as const;

export type Action = (typeof ACTIONS)[number];

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  OWNER: new Set(ACTIONS),
  ADMIN: new Set([
    "org:rename",
    "member:invite",
    "member:update",
    "client:write",
    "task:write",
    "invoice:write",
  ]),
  MEMBER: new Set(["task:write"]),
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].has(action);
}

export type MemberRef = {
  id: string;
  userId: string;
  role: Role;
};

export function memberChangeError(input: {
  actor: MemberRef;
  target: MemberRef;
  nextRole?: Role;
  remove?: boolean;
  ownerCount: number;
}): string | null {
  if (!can(input.actor.role, "member:update")) {
    return "You cannot change members";
  }
  if (input.actor.role === "ADMIN" && input.target.role === "OWNER") {
    return "An admin cannot change an owner";
  }
  if (input.nextRole === "OWNER" && input.actor.role !== "OWNER") {
    return "Only an owner can add another owner";
  }
  const removesOwner =
    input.target.role === "OWNER" &&
    (input.remove || (input.nextRole !== undefined && input.nextRole !== "OWNER"));
  if (removesOwner && input.ownerCount < 2) {
    return "The workspace needs at least one owner";
  }
  return null;
}

export function inviteRoleError(actorRole: Role, nextRole: Role): string | null {
  if (!can(actorRole, "member:invite")) return "You cannot invite members";
  if (nextRole === "OWNER" && actorRole !== "OWNER") {
    return "Only an owner can add another owner";
  }
  return null;
}
