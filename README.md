# Stream Music

**Stream Music** es una plataforma de streaming musical: catálogo de artistas, álbumes y pistas,
reproductor web, playlists, biblioteca, funciones sociales, búsqueda, suscripciones y panel de
administración.

Este repositorio es un **monorepo** con el backend (API), el frontend (web) y el código compartido.

## Stack

- **Backend (`apps/api`)** — NestJS + TypeScript + MongoDB (Mongoose). Autenticación JWT.
- **Frontend (`apps/web`)** — React + Vite + TypeScript, TanStack Query, Zustand, react-router,
  Tailwind CSS.
- **Compartido (`packages/shared`)** — tipos y contrato de la API usados por ambas apps.
- **Infra local** — MongoDB, Redis, Meilisearch y Mailhog vía Docker Compose.

## Identidad de marca

| Rol        | Color     |
| ---------- | --------- |
| Primario   | `#2d5a34` |
| Secundario | `#4e8c56` |
| Acento     | `#f5b31e` |

## Requisitos

- Node.js >= 20
- Docker (para los servicios locales) o instancias propias de MongoDB/Redis/Meilisearch

## Puesta en marcha

```bash
# 1. Instalar dependencias (monorepo)
npm install

# 2. Levantar los servicios locales
docker compose up -d        # mongo:27017, redis:6379, meili:7700, mailhog:8025

# 3. Configurar entorno
cp .env.example .env        # ajustá los valores si hace falta

# 4. Compilar el paquete compartido
npm run build --workspace @stream-music/shared

# 5. Levantar API y web
npm run dev:api             # http://localhost:3000/api/v1
npm run dev:web             # http://localhost:5173
```

La home del frontend consulta `GET /api/v1/health` para verificar la conexión de punta a punta.

## Comandos principales

| Comando             | Qué hace                                      |
| ------------------- | --------------------------------------------- |
| `npm run dev:api`   | Levanta la API en modo watch                  |
| `npm run dev:web`   | Levanta el frontend (Vite)                    |
| `npm run build`     | Compila todas las apps y paquetes             |
| `npm run lint`      | ESLint sobre todo el monorepo                 |
| `npm run format`    | Formatea con Prettier                         |
| `npm run typecheck` | Chequeo de tipos de todas las apps            |
| `npm test`          | Corre las pruebas de todas las apps           |

## Estructura

```
.
├── apps/
│   ├── api/        # NestJS (API REST)
│   └── web/        # React + Vite (SPA)
├── packages/
│   └── shared/     # Tipos y contrato de API compartidos
├── docker-compose.yml
└── .env.example
```

## Despliegue en producción (VPS + dominio)

Guía de lo que hay que hacer para publicar en un dominio (ej. `stream.duglasm.com`). **Casi
todo corre en el host del VPS** (MongoDB, la API con PM2, y nginx para TLS + SPA + reverse
proxy); en **Docker** va **solo SeaweedFS** (el object store de los medios). Detalle completo
y notas de seguridad en [`DEPLOYMENT.md`](DEPLOYMENT.md).

### Qué necesitás en el VPS

- **Node.js >= 20**, **nginx**, **Docker** (solo para SeaweedFS) y PM2 (`npm i -g pm2`).
- Puertos **80 y 443** abiertos.
- Un registro **DNS A** del dominio apuntando a la IP del VPS (debe resolver antes de emitir
  el certificado TLS).
- **MongoDB instalado y corriendo en el host**. Como la API también corre en el host, Mongo
  puede quedarse en `bindIp 127.0.0.1` (no hace falta exponerlo). Creá la base `stream_music`
  y un **usuario con auth** (no uses el root).

### Pasos (repo en `/opt/streaming_music`)

```bash
cd /opt/streaming_music

# 1) Config (NO se commitea; la API la lee como .env en la raíz del repo)
cp .env.production.example .env
#    Editá: CORS_ORIGIN, APP_URL, MONGODB_URI (127.0.0.1), S3_ENDPOINT (127.0.0.1:8333),
#    JWT_*, STORAGE_SIGNING_SECRET, S3_*, MAIL_* y ADMIN_*.  (secretos: openssl rand -base64 48)

# 2) Secret de SeaweedFS en docker/seaweedfs/s3.json (debe coincidir con S3_SECRET_KEY del .env)

# 3) SeaweedFS en Docker (único contenedor)
docker compose -f docker-compose.prod.yml up -d seaweedfs

# 4) Compilar e iniciar la API con PM2
npm ci
npm run build -w @stream-music/shared && npm run build -w @stream-music/api
mkdir -p storage
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup           # arranque en el boot (ejecutá la línea que imprime)
curl -sS http://127.0.0.1:3000/api/v1/health

# 5) Crear el admin inicial (seeder de producción, idempotente)
node apps/api/dist/seed-admin.js

# 6) Compilar el SPA y publicarlo en la raíz de nginx
npm run build -w @stream-music/web
sudo mkdir -p /var/www/stream-music
sudo cp -r apps/web/dist/* /var/www/stream-music/

# 7) nginx: instalar el server block y emitir el certificado TLS
sudo cp docker/nginx/stream-music.conf.example /etc/nginx/sites-available/stream-music.conf
sudo ln -s /etc/nginx/sites-available/stream-music.conf /etc/nginx/sites-enabled/
#    (ajustá el server_name del archivo a tu dominio)
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d stream.duglasm.com      # Let's Encrypt, con renovación automática

# 8) Verificar
curl -sS https://stream.duglasm.com/api/v1/health   # {status: ok, database: connected}
```

> Si el VPS no tiene Node para el SPA, compilá `apps/web/dist` en otra máquina y copialo a
> `/var/www/stream-music`.

### Actualizaciones (`git pull` primero)

- **API**: `npm run build -w @stream-music/shared && npm run build -w @stream-music/api && pm2 restart stream-music-api`
- **Frontend**: `npm run build -w @stream-music/web && sudo rsync -av --delete apps/web/dist/ /var/www/stream-music/`

## Roadmap

El trabajo está organizado por fases (Phase 0 a Phase 8) en los milestones e issues del repositorio
y en el board **Stream Music Roadmap**.
