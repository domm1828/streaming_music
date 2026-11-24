# Seguridad — Stream Music

Resumen de la revisión de seguridad sobre autenticación, subidas y entrega de
contenido, con los controles implementados y los riesgos aceptados.

## Controles implementados

### Autenticación y sesiones
- Contraseñas con **bcrypt**; nunca se exponen (`passwordHash` es `select:false`).
- **JWT** de acceso corto + **refresh rotativo** hasheado (SHA-256) en base, con
  protección de reuso.
- **2FA (TOTP)** opcional con códigos de recuperación hasheados; el login exige el
  segundo factor cuando está activo.
- **Rate limiting** global (`@nestjs/throttler`) y más estricto en `login` (anti
  fuerza bruta).
- **Helmet** para cabeceras de seguridad; CORS restringible por `CORS_ORIGIN`.
- Verificación de email por OTP; reset de contraseña por OTP con expiración.
- Login social: el proveedor verifica el email; se emiten los mismos JWT.

### Autorización
- RBAC con `PermissionsGuard`; endpoints de admin protegidos por permisos
  (`content.manage`, `users.*`, `catalog.manage`).
- Recursos propios (playlists, perfil, comentarios) validan dueño vs. moderador.

### Subidas y entrega
- Validación de tipo y tamaño en la subida de audio (MIME `audio/*`, 50 MB).
- **URLs firmadas** (HMAC con expiración) para servir archivos privados; verificación
  de firma con comparación de tiempo constante.
- Adjuntos de backstage con visibilidad restringida a dueño/admin a nivel de API.
- Entrada validada con `class-validator` + `ValidationPipe` (`whitelist` +
  `forbidNonWhitelisted`).

### Datos
- No se exponen secretos en respuestas; el filtro de excepciones normaliza errores
  sin filtrar stack traces al cliente.
- Índices únicos evitan duplicados (likes, follows, perfiles sociales, etc.).

## Riesgos aceptados / pendientes

- **Billing**: fuera de alcance en esta versión (Phase de monetización pospuesta); al
  integrarlo, auditar webhooks (verificación de firma) y manejo de PII de pago.
- **Entrega privada con disco local**: las URLs firmadas protegen el acceso, pero el
  archivo sigue en disco servido por la app; en producción se recomienda el driver S3
  con URLs presignadas y bucket privado.
- **GeoIP**: base local (geoip-lite) con precisión aproximada a nivel país.
- **CSRF**: la API es stateless con Bearer token (no cookies de sesión), por lo que el
  vector CSRF clásico no aplica; mantener así (no mover auth a cookies sin CSRF tokens).

## Recomendado antes de producción
- Rotar todos los secretos por entorno.
- Correr `npm audit` y la revisión de seguridad del repo (`/security-review`).
- Forzar TLS y `Secure`/`SameSite` si en el futuro se usan cookies.
