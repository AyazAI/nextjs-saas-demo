export function parseUsdToCents(input: string): number {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a dollar amount like 120 or 120.50");
  }
  const [dollars, fraction = ""] = trimmed.split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 10_000_000_00) {
    throw new Error("Amount must be between 0.01 and 10000000.00");
  }
  return cents;
}

export function lineTotalCents(quantity: number, unitAmountCents: number): number {
  return quantity * unitAmountCents;
}

export function invoiceTotalCents(
  lines: Array<{ quantity: number; unitAmountCents: number }>,
): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line.quantity, line.unitAmountCents), 0);
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${remainder.toString().padStart(2, "0")}`;
}
