import { z } from "zod";

function blankToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().max(max).optional()) as z.ZodType<string | undefined>;

const optionalEmail = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : undefined;
}, z.string().email("Enter a valid email").max(120).optional()) as z.ZodType<string | undefined>;

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  password: passwordSchema,
  organizationName: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(80),
});

export const orgNameSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters").max(80),
});

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Client name must be at least 2 characters").max(120),
  email: optionalEmail,
  company: optionalText(120),
  notes: optionalText(2000),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters").max(160),
  description: optionalText(2000),
  clientId: optionalText(80),
  assigneeId: optionalText(80),
  status: z.preprocess(
    (value) => (value === "" || value === undefined ? "TODO" : value),
    z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  ) as z.ZodType<"TODO" | "IN_PROGRESS" | "DONE">,
  dueOn: optionalText(10),
});

export const taskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  _action: z.string().optional(),
});

export const invoiceCreateSchema = z.object({
  clientId: z.string().trim().min(1, "Choose a client"),
  description: z.string().trim().min(2, "Describe the line").max(200),
  quantity: z.coerce.number().int("Quantity must be a whole number").min(1).max(1000),
  unitAmount: z.string().trim().min(1, "Enter an amount"),
  notes: optionalText(2000),
  dueOn: optionalText(10),
});

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(2, "Describe the line").max(200),
  quantity: z.coerce.number().int("Quantity must be a whole number").min(1).max(1000),
  unitAmount: z.string().trim().min(1, "Enter an amount"),
});

export const invoiceStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "VOID"]).optional(),
  _action: z.string().optional(),
});

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

export const memberUpdateSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).optional(),
  _action: z.string().optional(),
});

export const slugSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Choose a workspace")
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Choose a workspace"),
});
