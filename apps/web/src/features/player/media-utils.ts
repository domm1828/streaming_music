/** Utilidades compartidas por los motores de reproducción (audio y video). */

/** Fin (en segundos) del rango buffereado que cubre la posición actual. */
export function bufferedAhead(el: HTMLMediaElement): number {
  const b = el.buffered;
  const t = el.currentTime;
  for (let i = 0; i < b.length; i++) {
    if (t >= b.start(i) - 0.5 && t <= b.end(i) + 0.5) return b.end(i);
  }
  return b.length ? b.end(b.length - 1) : 0;
}

/** true si el navegador está en modo ahorro de datos. */
export function isSaveData(): boolean {
  return Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
}
