export function safeQueryMessage(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 240) return null;
  if (/[<>]/.test(trimmed)) return null;
  return trimmed;
}
