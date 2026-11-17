import { signupSchema } from "@/domain/schemas";
import { prisma } from "@/lib/db";
import { HttpError, parseInput, prismaCode } from "@/server/http";
import { hashPassword } from "@/server/password";
import { createOrganizationForUser } from "@/server/orgs";

export async function signupAccount(raw: Record<string, string>) {
  const input = parseInput(signupSchema, raw);
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
    });
    const organization = await createOrganizationForUser(user.id, input.organizationName);
    return { userId: user.id, organization };
  } catch (error) {
    if (prismaCode(error) === "P2002") {
      throw new HttpError(409, "An account with that email already exists");
    }
    throw error;
  }
}
