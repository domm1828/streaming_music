/** Una línea de letra; `time` en segundos, o null si la letra no está sincronizada. */
export interface LyricLine {
  time: number | null;
  text: string;
}

export interface ParsedLyrics {
  synced: boolean;
  lines: LyricLine[];
}

const TIME_TAG = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Parsea una letra en texto plano o formato LRC sincronizado.
 * - LRC: líneas con uno o más sellos `[mm:ss.xx]`; las etiquetas de metadata
 *   (`[ar:]`, `[ti:]`, …) se ignoran.
 * - Plano: cada renglón se devuelve con `time: null`.
 */
export function parseLyrics(raw: string): ParsedLyrics {
  const text = (raw ?? '').replace(/\r\n/g, '\n');
  const timed: LyricLine[] = [];
  let sawTimeTag = false;

  for (const line of text.split('\n')) {
    TIME_TAG.lastIndex = 0;
    const stamps: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = TIME_TAG.exec(line)) !== null) {
      const min = Number(match[1]);
      const sec = Number(match[2]);
      const frac = match[3] ? Number(`0.${match[3]}`) : 0;
      stamps.push(min * 60 + sec + frac);
    }
    if (stamps.length === 0) continue; // metadata o renglón sin sello
    sawTimeTag = true;
    const content = line.replace(TIME_TAG, '').trim();
    for (const time of stamps) timed.push({ time, text: content });
  }

  if (sawTimeTag) {
    timed.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
    return { synced: true, lines: timed };
  }

  // Texto plano: conservar renglones no vacíos.
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => ({ time: null, text: l }));
  return { synced: false, lines };
}

/** Índice de la línea activa para un tiempo dado (la última cuyo sello ya pasó). */
export function activeLineIndex(lines: LyricLine[], currentTime: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].time;
    if (t !== null && t <= currentTime + 0.05) idx = i;
    else if (t !== null && t > currentTime) break;
  }
  return idx;
}
