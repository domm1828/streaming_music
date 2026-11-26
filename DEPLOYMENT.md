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

En **producción** solo hace falta crear el usuario administrador inicial. El seeder de
producción crea **únicamente** ese usuario (sin datos demo), con las credenciales que le
pasás por variables de entorno — nunca van en el repo — y es idempotente:

```bash
ADMIN_EMAIL=admin@tudominio.com ADMIN_PASSWORD='una-clave-segura' \
  npm run seed:prod --workspace @stream-music/api
```

- `ADMIN_EMAIL` y `ADMIN_PASSWORD` (≥ 8 caracteres) son **obligatorios**; si faltan, el
  seeder aborta con error y código ≠ 0.
- Opcionales: `ADMIN_USERNAME` (default `admin`), `ADMIN_NAME` (default `Administrador`).
- Si el usuario ya existe, no se duplica: se garantiza que tenga el rol `admin` y se
  respeta su clave actual, salvo que pases `ADMIN_RESET_PASSWORD=true` para actualizarla.

El usuario queda con rol `admin` y email verificado. Cambiá la clave tras el primer acceso.

Para un entorno de **desarrollo/demo** (usuarios, catálogo y playlist de ejemplo):

```bash
npm run seed --workspace @stream-music/api   # datos demo (idempotente) — NO usar en producción
```

Los roles por defecto (`admin`, `user`), settings, localización y páginas del CMS se
siembran solos al primer arranque.

## Despliegue en un VPS (host + nginx, con SeaweedFS en Docker)

El stack corre bajo **un dominio** con **TLS** (Let's Encrypt). Front y API comparten
origen, así que no hay CORS entre ellos. **Casi todo corre en el host del VPS**; en Docker
va **solo SeaweedFS**.

| Componente | Dónde corre | Publica | Rol |
|---|---|---|---|
| **MongoDB** | host | `127.0.0.1:27017` | Base de datos |
| **API NestJS** | host (Node + **PM2**) | `127.0.0.1:3000` | API; lee el `.env` de la raíz del repo |
| **nginx** | host | 80, 443 | TLS, sirve el SPA y reverse proxy |
| **SeaweedFS** | **Docker** | `127.0.0.1:8333` | Object store S3 de los medios |

**Ruteo de nginx** (`docker/nginx/stream-music.conf.example`): `/api/*` y `/socket.io/*` →
`127.0.0.1:3000`; `/s3/*` → `127.0.0.1:8333` (sin el prefijo `/s3`); el resto → SPA con
fallback a `index.html`. No se usan `redis` (no se usa) ni `meilisearch` (opcional; con
`SEARCH_DRIVER=auto` la búsqueda cae al índice de texto de Mongo).

### Requisitos previos
- Un VPS con **Node 20+**, **nginx**, **Docker** (solo para SeaweedFS) y los puertos
  **80 y 443** abiertos.
- Un registro **DNS A** de `stream.duglasm.com` apuntando a la IP del VPS (Let's Encrypt
  valida por HTTP-01, así que el dominio ya debe resolver antes de emitir el certificado).
- **MongoDB instalado y corriendo en el host**. Como la API también corre en el host, Mongo
  puede quedarse en `bindIp 127.0.0.1` (no hace falta exponerlo). Creá la base `stream_music`
  y un usuario con auth (no uses el root) y poné esas credenciales en `MONGODB_URI`.

### Pasos (se asume el repo en `/opt/streaming_music`)
```bash
cd /opt/streaming_music

# 1) Config (NO se commitea; la API la lee como .env en la raíz del repo)
cp .env.production.example .env
#    editá: CORS_ORIGIN, APP_URL, MONGODB_URI (127.0.0.1), S3_ENDPOINT (127.0.0.1:8333),
#    JWT_*, STORAGE_SIGNING_SECRET, S3_* y ADMIN_*   (generá secretos: openssl rand -base64 48)

# 2) Secret de SeaweedFS en docker/seaweedfs/s3.json (debe coincidir con S3_SECRET_KEY del .env)

# 3) SeaweedFS en Docker (único contenedor)
docker compose -f docker-compose.prod.yml up -d seaweedfs

# 4) Compilar e iniciar la API con PM2
npm ci
npm run build -w @stream-music/shared && npm run build -w @stream-music/api
mkdir -p storage
pm2 start ecosystem.config.cjs          # usa cwd=/opt/streaming_music (ajustalo si cambia)
pm2 save && pm2 startup                  # arranque en el boot (ejecutá la línea que imprime)
curl -sS http://127.0.0.1:3000/api/v1/health   # {status: ok, database: connected}

# 5) Admin inicial (seeder de producción, idempotente)
node apps/api/dist/seed-admin.js

# 6) Compilar el SPA y publicarlo en la raíz de nginx
npm run build -w @stream-music/web
sudo mkdir -p /var/www/stream-music
sudo cp -r apps/web/dist/* /var/www/stream-music/

# 7) nginx: instalar el server block y emitir el certificado
sudo cp docker/nginx/stream-music.conf.example /etc/nginx/sites-available/stream-music.conf
sudo ln -s /etc/nginx/sites-available/stream-music.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d stream.duglasm.com          # TLS Let's Encrypt (renovación automática)

# 8) Verificar
curl -sS https://stream.duglasm.com/api/v1/health
```

> Si el VPS no tiene Node para el SPA, podés compilar `apps/web/dist` en otra máquina y
> copiarlo a `/var/www/stream-music`.

**Actualizaciones** (`git pull` primero):
- **API**: `npm run build -w @stream-music/shared && npm run build -w @stream-music/api && pm2 restart stream-music-api`
- **Front**: `npm run build -w @stream-music/web && sudo rsync -av --delete apps/web/dist/ /var/www/stream-music/`

### Notas de seguridad
- El `.env` y el `s3.json` con el secret real **fuera del repo** (ya en `.gitignore`).
- Cerrá a Internet los puertos internos: `sudo ufw deny 3000` (nginx llega por loopback) y no
  expongas Mongo (`bindIp 127.0.0.1`). Abrí solo `80/443` (y SSH).
- El MongoDB del host corre con auth; `MONGODB_URI` incluye usuario/clave y `authSource`.
- SeaweedFS sirve lectura pública/anónima de los assets (equivalente a servir `/uploads`);
  no guardes datos sensibles en el bucket público.
- Cambiá la clave del admin tras el primer acceso.

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
