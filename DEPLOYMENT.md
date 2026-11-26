# Despliegue de Stream Music

Guía para desplegar Stream Music (API NestJS + web React) a producción.

## Servicios requeridos

| Servicio | Uso | Obligatorio |
|---|---|---|
| MongoDB 7+ | Base de datos principal | Sí |
| Redis 7+ | Colas/caché (opcional en esta versión) | No |
| Meilisearch v1.11+ | Búsqueda rápida (fallback a Mongo si falta) | No |
| SMTP | Envío de correos (verificación, reset, notificaciones) | Recomendado |
| S3 / compatible | Almacenamiento de media en la nube | No (default: disco local) |
| Sentry | Monitoreo de errores | No |

## Variables de entorno (API)

Ver `.env.example` para la lista completa. Mínimas para producción:

- `NODE_ENV=production`
- `PORT=3000`
- `MONGODB_URI=mongodb://…`
- `CORS_ORIGIN=https://tu-dominio` · `APP_URL=https://tu-dominio`
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` — **secretos largos y aleatorios** (obligatorio cambiarlos)
- `STORAGE_SIGNING_SECRET` — secreto para firmar URLs de archivos privados
- Mail: `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM`

Opcionales según features:
- Búsqueda: `SEARCH_DRIVER=auto`, `MEILI_HOST`, `MEILI_MASTER_KEY`
- Importación: `SPOTIFY_CLIENT_ID/SECRET`, `LASTFM_API_KEY`
- IA: `OPENAI_API_KEY`
- Login social: `GOOGLE_CLIENT_ID/SECRET`
- Storage S3: `STORAGE_DRIVER=s3`, `S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY/SECRET_KEY`, `S3_PUBLIC_URL` (ver más abajo)
- Monitoreo: `SENTRY_DSN`, `APP_RELEASE`
- Límites: `LISTEN_MINUTES_LIMIT`

Web (build): `VITE_SENTRY_DSN`, `VITE_APP_RELEASE` (opcionales).

## Build y arranque

```bash
npm ci
npm run build            # construye shared, api y web
# API
node apps/api/dist/main.js
# Web: servir apps/web/dist/ como estático (Nginx, CDN, etc.) con fallback a index.html (SPA)
```

El API sirve `/api/v1`, los archivos subidos en `/uploads`, el endpoint TUS en
`/api/v1/uploads/tus` y el sitemap en `/api/v1/sitemap.xml`. Poné un reverse proxy
(Nginx) delante que termine TLS y enrute `/api` y `/socket.io` (WebSocket) al API,
y el resto al build estático de la web.

## Almacenamiento de medios (S3 / SeaweedFS)

Por defecto los archivos van a disco local y se sirven en `/uploads`. Para usar un
backend de objetos S3-compatible, poné `STORAGE_DRIVER=s3` y las credenciales. Sirve
cualquier implementación S3 (AWS S3, MinIO, SeaweedFS); el bucket se crea solo si no
existe.

- `S3_ENDPOINT` — URL del servicio S3 (vacío para AWS S3 nativo; con endpoint se usa
  *path-style* automáticamente, como requieren SeaweedFS/MinIO).
- `S3_PUBLIC_URL` — base pública para las URLs de assets servidas al navegador. Suele
  ser `<endpoint>/<bucket>`, o el dominio de un CDN delante del bucket. Si se deja
  vacío con driver `s3`, se deriva de `S3_ENDPOINT`/`S3_BUCKET`.
- `S3_PUBLIC_READ` — `true` si el bucket sirve objetos con lectura pública (CDN o acceso
  anónimo, como el SeaweedFS de desarrollo): los archivos privados (audio) se entregan por
  su URL pública. Para un bucket privado (AWS S3 sin acceso anónimo), dejalo en blanco y se
  usan URLs *presigned* temporales.
- Las imágenes públicas requieren lectura anónima (o un CDN) delante del bucket.

**SeaweedFS para desarrollo**: el `docker-compose.yml` incluye el servicio `seaweedfs`
(gateway S3 en `:8333`) con las identidades definidas en `docker/seaweedfs/s3.json`
(una credencial de administración y lectura anónima para los assets públicos). Para
activarlo:

```bash
docker compose up -d seaweedfs
# en .env:
STORAGE_DRIVER=s3
S3_ENDPOINT=http://localhost:8333
S3_REGION=us-east-1
S3_BUCKET=stream-music
S3_ACCESS_KEY=streammusic
S3_SECRET_KEY=streammusic-secret-change-me
S3_PUBLIC_URL=http://localhost:8333/stream-music
S3_PUBLIC_READ=true
```

> SeaweedFS no valida las URLs *presigned* SigV4 por query del AWS SDK v3; por eso en
> desarrollo se usa `S3_PUBLIC_READ=true` (el bucket tiene lectura anónima). Contra AWS S3
> con bucket privado, omití el flag y las presigned funcionan de forma nativa.

Cambiá `accessKey`/`secretKey` de `docker/seaweedfs/s3.json` (y las variables) antes de
cualquier entorno expuesto.

## Datos iniciales

```bash
npm run seed --workspace @stream-music/api   # usuarios, catálogo y playlist demo (idempotente)
```

Los roles por defecto (`admin`, `user`), settings, localización y páginas del CMS se
siembran solos al primer arranque.

## Checklist de pre-despliegue

- [ ] `JWT_*` y `STORAGE_SIGNING_SECRET` son secretos fuertes y únicos por entorno.
- [ ] `CORS_ORIGIN`/`APP_URL` apuntan al dominio real (no `*`).
- [ ] MongoDB con auth, backups y réplica.
- [ ] TLS terminado en el proxy; `trust proxy` activo (ya configurado en el API).
- [ ] `npm run lint && npm run typecheck && npm test` en verde en CI.
- [ ] Rate limiting y `helmet` activos (por defecto).
- [ ] Sentry configurado con `SENTRY_DSN` y `APP_RELEASE` del build.
- [ ] Si se usa S3: bucket privado, credenciales con permisos mínimos.

## Rollback

- Mantené la versión anterior del artefacto (imagen/build) disponible.
- Los cambios de esquema son aditivos (Mongoose, sin migraciones destructivas); un
  rollback de la app no requiere migración inversa en esta versión.
- Para revertir: redeploy del artefacto anterior + invalidar la caché del CDN de la web.
- Verificá `GET /api/v1/health` (estado `ok` y `database: connected`) tras el rollback.
