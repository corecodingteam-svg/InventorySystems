/** Timestamp+random document numbers (PO-..., GR-..., SO-...). A proper per-organization sequence is a later improvement — see docs/purchasing.md and docs/sales.md. */
export function generateDocNumber(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}
