import { describe, expect, it } from 'vitest';
import { AudioService } from './audio.service';

describe('AudioService.generateWaveformPeaks', () => {
  const service = new AudioService();

  it('devuelve la cantidad de buckets pedida', () => {
    const buffer = Buffer.alloc(2000, 200);
    const peaks = service.generateWaveformPeaks(buffer, 50);
    expect(peaks).toHaveLength(50);
  });

  it('normaliza los picos entre 0 y 1', () => {
    const buffer = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));
    const peaks = service.generateWaveformPeaks(buffer, 20);
    expect(peaks.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it('devuelve vacío para un buffer vacío', () => {
    expect(service.generateWaveformPeaks(Buffer.alloc(0))).toEqual([]);
  });
});
