import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageGenService, extFromImageType } from './image-gen.service';
import type { SettingsService } from '../settings/settings.service';

function makeService(over: Partial<SettingsService> = {}) {
  const settings = {
    get: async <T>(_k: string, fallback: T) => fallback,
    getNumber: async (_k: string, fallback: number) => fallback,
    ...over,
  } as unknown as SettingsService;
  return new ImageGenService(settings);
}

function imageResponse(bytes: number[], contentType = 'image/jpeg', ok = true, status = 200): Response {
  return {
    ok,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? contentType : null) },
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  } as unknown as Response;
}

describe('ImageGenService (fetch mockeado)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('genera una imagen y arma la URL de Pollinations con los params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(imageResponse([1, 2, 3, 4]));
    vi.stubGlobal('fetch', fetchMock);

    const svc = makeService();
    const res = await svc.generate({ prompt: 'portada chill lofi', width: 512, height: 512, seed: 7 });

    expect(res.contentType).toBe('image/jpeg');
    expect(Buffer.isBuffer(res.buffer)).toBe(true);
    expect(res.buffer.length).toBe(4);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('https://image.pollinations.ai/prompt/');
    expect(url).toContain(encodeURIComponent('portada chill lofi'));
    expect(url).toContain('width=512');
    expect(url).toContain('height=512');
    expect(url).toContain('nologo=true');
    expect(url).toContain('private=true');
    expect(url).toContain('model=flux');
    expect(url).toContain('seed=7');
  });

  it('rechaza un prompt demasiado corto sin llamar a la red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(makeService().generate({ prompt: 'ab' })).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falla si la respuesta no es una imagen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse([1], 'text/html')));
    await expect(makeService().generate({ prompt: 'algo valido' })).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('falla si Pollinations responde con error HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse([1], 'image/jpeg', false, 500)));
    await expect(makeService().generate({ prompt: 'algo valido' })).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('falla (502) cuando la generación se aborta por timeout', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(makeService().generate({ prompt: 'algo valido' })).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('rechaza una imagen que supera el máximo de MB', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse([1, 2, 3])));
    const svc = makeService({ getNumber: async () => 0 } as Partial<SettingsService>);
    await expect(svc.generate({ prompt: 'algo valido' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('extFromImageType mapea los tipos conocidos', () => {
    expect(extFromImageType('image/png')).toBe('.png');
    expect(extFromImageType('image/webp')).toBe('.webp');
    expect(extFromImageType('image/jpeg')).toBe('.jpg');
    expect(extFromImageType('image/anything')).toBe('.jpg');
  });
});
