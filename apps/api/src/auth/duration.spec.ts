import { describe, expect, it } from 'vitest';
import { durationToMs } from './duration';

describe('durationToMs', () => {
  it('convierte minutos, horas y días', () => {
    expect(durationToMs('15m')).toBe(15 * 60_000);
    expect(durationToMs('2h')).toBe(2 * 3_600_000);
    expect(durationToMs('30d')).toBe(30 * 86_400_000);
    expect(durationToMs('45s')).toBe(45_000);
  });

  it('lanza error ante formatos inválidos', () => {
    expect(() => durationToMs('abc')).toThrow();
    expect(() => durationToMs('10')).toThrow();
  });
});
