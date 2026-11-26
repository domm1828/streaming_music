# syntax=docker/dockerfile:1
# Imagen de la API (NestJS). Contexto de build = raíz del monorepo.

# ─── build: instala el workspace y compila shared + api ───
FROM node:26-alpine AS build
WORKDIR /app

# Manifiestos primero para aprovechar la caché de capas.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

# Código y build (el paquete compartido va antes que la API).
COPY . .
RUN npm run build -w @stream-music/shared \
 && npm run build -w @stream-music/api \
 && npm prune --omit=dev

# ─── runtime: solo lo necesario para ejecutar ───
FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache curl

# node_modules (con el symlink del workspace a @stream-music/shared) + dist compilados.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist

# Directorio de subidas/TUS (montado como volumen en el compose).
ENV STORAGE_DIR=/app/storage
RUN mkdir -p /app/storage

EXPOSE 3000
# Comprueba el endpoint de salud del API.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/main.js"]
