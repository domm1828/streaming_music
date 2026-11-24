/** Convierte una duración tipo '15m', '2h', '30d', '45s' a milisegundos. */
export function durationToMs(value: string): number {
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) throw new Error(`Duración inválida: ${value}`);
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * unitMs[unit];
}
