export function now(): number {
  return Date.now();
}

export function isExpired(deletedAt: number | null, expiryDays: number = 30): boolean {
  if (deletedAt === null) return false;
  const expiryMs = expiryDays * 24 * 60 * 60 * 1000;
  return Date.now() - deletedAt > expiryMs;
}