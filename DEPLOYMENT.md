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

## Despliegue en un VPS con Docker + nginx (HTTPS)

El stack corre bajo **un dominio** con **TLS** (Let's Encrypt). Front y API comparten
origen, así que no hay CORS entre ellos. **En Docker van solo la API y SeaweedFS**; el
**frontend (SPA), el TLS y el ruteo los maneja nginx en el host**, igual que MongoDB.

Servicios en Docker (`docker-compose.prod.yml`):

| Servicio | Imagen / build | Publica | Rol |
|---|---|---|---|
| `api` | `apps/api/Dockerfile` (Node 26) | `127.0.0.1:3000` | API NestJS |
| `seaweedfs` | `chrislusf/seaweedfs` | `127.0.0.1:8333` | Object store S3 de los medios |

Ambos se publican **solo en loopback**: los consume el nginx del host, no Internet.

En el **host del VPS** (fuera de Docker):
- **MongoDB**: la API lo alcanza por `host.docker.internal`, que `docker-compose.prod.yml`
  mapea a la IP del host con `extra_hosts: host-gateway`.
- **nginx**: termina TLS, sirve el SPA (`apps/web/dist`) y hace de reverse proxy —
  `/api/*` y `/socket.io/*` → `127.0.0.1:3000`; `/s3/*` → `127.0.0.1:8333` (sin el prefijo
  `/s3`); el resto → SPA con fallback a `index.html`. Config lista en
  `docker/nginx/stream-music.conf.example`.

No se incluyen `redis` (no se usa) ni `meilisearch` (opcional; con `SEARCH_DRIVER=auto`
la búsqueda cae al índice de texto de Mongo).

### Requisitos previos
- Un VPS con Docker + Docker Compose v2, **nginx** y **Node 20+** (para compilar el SPA),
  y los puertos **80 y 443** abiertos.
- Un registro **DNS A** de `stream.duglasm.com` apuntando a la IP del VPS (Let's Encrypt
  valida por HTTP-01, así que el dominio ya debe resolver antes de emitir el certificado).
- **MongoDB ya instalado y corriendo en el host**, accesible desde los contenedores:
  - En `/etc/mongod.conf`, `net.bindIp` debe incluir la IP del gateway de Docker
    (p.ej. `127.0.0.1,172.17.0.1`) o `0.0.0.0` (en ese caso, cerrá el puerto 27017 en el
    firewall a todo lo externo). Reiniciá `mongod` tras el cambio.
  - Creá la base `stream_music` y un usuario con auth (no uses el root); poné esas
    credenciales en `MONGODB_URI`.

### Pasos
```bash
# 1) Config de producción (NO se commitea; contiene secretos)
cp .env.production.example .env.production
#    editá: CORS_ORIGIN, APP_URL, MONGODB_URI (apunta a host.docker.internal),
#    JWT_* , STORAGE_SIGNING_SECRET, S3_* y ADMIN_*  (usá  openssl rand -base64 48)

# 2) Cambiá el secret por defecto de SeaweedFS en docker/seaweedfs/s3.json
#    (debe coincidir con S3_SECRET_KEY del .env.production)

# 3) Contenedores (API + SeaweedFS)
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 4) Admin inicial (seeder de producción, idempotente)
docker compose -f docker-compose.prod.yml exec api node apps/api/dist/seed-admin.js
#    toma ADMIN_EMAIL / ADMIN_PASSWORD del entorno del contenedor (ya en .env.production)

# 5) Compilar el SPA y publicarlo en la raíz de nginx
npm ci
npm run build -w @stream-music/shared && npm run build -w @stream-music/web
sudo mkdir -p /var/www/stream-music
sudo cp -r apps/web/dist/* /var/www/stream-music/

# 6) nginx: instalar el server block y emitir el certificado
sudo cp docker/nginx/stream-music.conf.example /etc/nginx/sites-available/stream-music.conf
sudo ln -s /etc/nginx/sites-available/stream-music.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d stream.duglasm.com          # TLS Let's Encrypt (renovación automática)

# 7) Verificar
curl -sS https://stream.duglasm.com/api/v1/health   # {status: ok, database: connected}
```

> Si el VPS no tiene Node, podés compilar el SPA en otra máquina (o en un contenedor
> descartable) y copiar el contenido de `apps/web/dist` a `/var/www/stream-music`.

En cada actualización del front, repetí el paso 5 (rebuild + copiar `dist`). En cada
cambio de la API, `docker compose ... up -d --build api`.

### Notas de seguridad
- `.env.production` y `s3.json` con el secret real **fuera del repo** (ya en `.gitignore`).
- El MongoDB del host corre con auth; `MONGODB_URI` incluye usuario/clave y `authSource`.
  Si exponés `mongod` en `0.0.0.0`, bloqueá el puerto 27017 en el firewall salvo para el host.
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
