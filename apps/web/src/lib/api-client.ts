import axios from 'axios';

/**
 * Cliente HTTP base. Apunta a /api/v1 (proxyeado a la API en desarrollo).
 * El header Authorization con JWT y el refresh-on-401 se agregan en la Phase 1.
 */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { Accept: 'application/json' },
});
