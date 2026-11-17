export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "VOID";

const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID"],
  SENT: ["PAID", "VOID"],
  PAID: [],
  VOID: [],
};

export function nextStatuses(status: InvoiceStatus): InvoiceStatus[] {
  return [...TRANSITIONS[status]];
}

export function transitionError(from: InvoiceStatus, to: InvoiceStatus): string | null {
  if (from === to) return null;
  if (!TRANSITIONS[from].includes(to)) {
    return `An invoice cannot move from ${from} to ${to}`;
  }
  return null;
}

export function linesAreEditable(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

export function invoiceCanBeDeleted(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}
