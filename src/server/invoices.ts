import { INVOICE_STATUS_LABEL } from "@/domain/labels";
import { parseIsoDate } from "@/domain/dates";
import {
  invoiceCanBeDeleted,
  linesAreEditable,
  transitionError,
  type InvoiceStatus,
} from "@/domain/invoices";
import { parseUsdToCents } from "@/domain/money";
import { assertCapacity } from "@/domain/plans";
import { invoiceCreateSchema, invoiceLineSchema, invoiceStatusSchema } from "@/domain/schemas";
import { prisma } from "@/lib/db";
import type { MembershipContext } from "@/server/access";
import { requireAction } from "@/server/access";
import { recordActivity } from "@/server/activity";
import { HttpError, parseInput, prismaCode } from "@/server/http";
import { usedCount } from "@/server/usage";

const invoiceInclude = {
  client: { select: { id: true, name: true, email: true, company: true } },
  lines: { orderBy: { position: "asc" as const } },
};

function readDate(value: string | undefined) {
  try {
    return parseIsoDate(value);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid date");
  }
}

function readCents(value: string) {
  try {
    return parseUsdToCents(value);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Invalid amount");
  }
}

async function nextInvoiceNumber(organizationId: string) {
  const rows = await prisma.invoice.findMany({
    where: { organizationId, number: { startsWith: "INV-" } },
    select: { number: true },
  });
  let max = 1000;
  for (const row of rows) {
    const value = Number(row.number.slice(4));
    if (Number.isInteger(value) && value > max) max = value;
  }
  return `INV-${max + 1}`;
}

export async function listInvoices(organizationId: string) {
  return prisma.invoice.findMany({
    where: { organizationId },
    include: invoiceInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(organizationId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: invoiceInclude,
  });
}

export async function createInvoice(actor: MembershipContext, raw: Record<string, string>) {
  requireAction(actor.role, "invoice:write");
  const input = parseInput(invoiceCreateSchema, raw);
  const used = await usedCount(actor.organizationId, "invoices");
  assertCapacity(actor.organization.plan, "invoices", used);
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, organizationId: actor.organizationId },
  });
  if (!client) throw new HttpError(400, "Choose a client in this workspace");
  const cents = readCents(input.unitAmount);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: actor.organizationId,
          clientId: client.id,
          number: await nextInvoiceNumber(actor.organizationId),
          notes: input.notes,
          dueOn: readDate(input.dueOn),
          lines: {
            create: [
              {
                description: input.description,
                quantity: input.quantity,
                unitAmountCents: cents,
                position: 1,
              },
            ],
          },
        },
      });
      await recordActivity(
        actor.organizationId,
        actor.userId,
        "invoice.create",
        `Created invoice ${invoice.number} for ${client.name}`,
      );
      return invoice;
    } catch (error) {
      if (prismaCode(error) === "P2002") continue;
      throw error;
    }
  }
  throw new HttpError(409, "Could not allocate an invoice number");
}

export async function addInvoiceLine(
  actor: MembershipContext,
  invoiceId: string,
  raw: Record<string, string>,
) {
  requireAction(actor.role, "invoice:write");
  const input = parseInput(invoiceLineSchema, raw);
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: actor.organizationId },
    include: { lines: true },
  });
  if (!invoice) throw new HttpError(404, "Invoice not found");
  if (!linesAreEditable(invoice.status)) {
    throw new HttpError(400, "Lines can be added while the invoice is a draft");
  }
  const position = invoice.lines.reduce((max, line) => Math.max(max, line.position), 0) + 1;
  await prisma.invoiceLine.create({
    data: {
      invoiceId: invoice.id,
      description: input.description,
      quantity: input.quantity,
      unitAmountCents: readCents(input.unitAmount),
      position,
    },
  });
  await recordActivity(
    actor.organizationId,
    actor.userId,
    "invoice.line",
    `Added a line to ${invoice.number}`,
  );
}

export async function updateInvoice(
  actor: MembershipContext,
  invoiceId: string,
  raw: Record<string, string>,
) {
  requireAction(actor.role, "invoice:write");
  const invoice = await getInvoice(actor.organizationId, invoiceId);
  if (!invoice) throw new HttpError(404, "Invoice not found");
  if (raw._action === "delete") {
    if (!invoiceCanBeDeleted(invoice.status)) {
      throw new HttpError(400, "Only a draft invoice can be deleted");
    }
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await recordActivity(
      actor.organizationId,
      actor.userId,
      "invoice.delete",
      `Deleted draft ${invoice.number}`,
    );
    return { deleted: true as const, invoice };
  }
  const input = parseInput(invoiceStatusSchema, raw);
  if (!input.status) throw new HttpError(400, "Choose a status");
  const message = transitionError(invoice.status, input.status);
  if (message) throw new HttpError(400, message);
  if (input.status !== invoice.status) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: input.status } });
    await recordActivity(
      actor.organizationId,
      actor.userId,
      "invoice.status",
      `Marked ${invoice.number} ${INVOICE_STATUS_LABEL[input.status as InvoiceStatus]}`,
    );
  }
  return { deleted: false as const, invoice };
}
