# syntax=docker/dockerfile:1
# Edge de producción: compila el SPA y lo sirve con Caddy (TLS automático + proxy).
# Contexto de build = raíz del monorepo.

# ─── build: compila el SPA (Vite) ───
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY . .
# El cliente HTTP del SPA usa rutas relativas (/api/v1): no hace falta VITE_API_URL.
# Sentry del front es opcional (build args).
ARG VITE_SENTRY_DSN=""
ARG VITE_APP_RELEASE=""
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_APP_RELEASE=$VITE_APP_RELEASE
RUN npm run build -w @stream-music/shared \
 && npm run build -w @stream-music/web

# ─── runtime: Caddy sirve los estáticos y hace de reverse proxy ───
FROM caddy:2-alpine AS runtime
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
EXPOSE 80 443
# El entrypoint por defecto de la imagen caddy ejecuta:
#   caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
