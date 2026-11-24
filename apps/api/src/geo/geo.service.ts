import { Injectable } from '@nestjs/common';
import geoip from 'geoip-lite';

/** Resolución GeoIP local (sin llamadas externas, no bloquea el request). */
@Injectable()
export class GeoService {
  /** Código de país (ISO) a partir de una IP, o null si no se puede resolver. */
  country(ip: string | null | undefined): string | null {
    if (!ip) return null;
    // Normaliza IPv4-mapped IPv6 (::ffff:1.2.3.4) y listas de X-Forwarded-For.
    const clean = ip.replace(/^::ffff:/, '').split(',')[0]!.trim();
    try {
      return geoip.lookup(clean)?.country ?? null;
    } catch {
      return null;
    }
  }
}
