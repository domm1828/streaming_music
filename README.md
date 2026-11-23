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

## Roadmap

El trabajo está organizado por fases (Phase 0 a Phase 8) en los milestones e issues del repositorio
y en el board **Stream Music Roadmap**.
