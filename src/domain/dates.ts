export function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Use a date in YYYY-MM-DD form");
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("That date is not valid");
  const [year, month, day] = trimmed.split("-").map(Number);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error("That date is not valid");
  }
  return date;
}
