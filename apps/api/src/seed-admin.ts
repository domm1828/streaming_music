import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { RolesService } from './users/roles.service';

/**
 * Seeder de PRODUCCIÓN: crea únicamente un usuario administrador.
 *
 * A diferencia de `seed.ts` (datos demo), no siembra usuario demo ni catálogo.
 * Las credenciales se leen de variables de entorno — nunca viven en el repo —
 * y la operación es idempotente (se puede correr varias veces sin duplicar).
 *
 *   ADMIN_EMAIL           (requerido)
 *   ADMIN_PASSWORD        (requerido, mínimo 8 caracteres)
 *   ADMIN_USERNAME        (opcional, default 'admin')
 *   ADMIN_NAME            (opcional, default 'Administrador')
 *   ADMIN_RESET_PASSWORD  (opcional, 'true' para actualizar la clave si el usuario ya existe)
 */
async function seedAdmin(): Promise<void> {
  const logger = new Logger('SeedAdmin');

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
  const resetPassword = process.env.ADMIN_RESET_PASSWORD === 'true';

  const missing: string[] = [];
  if (!email) missing.push('ADMIN_EMAIL');
  if (!password) missing.push('ADMIN_PASSWORD');
  if (missing.length) {
    logger.error(`Faltan variables de entorno requeridas: ${missing.join(', ')}.`);
    logger.error(
      'Ejemplo: ADMIN_EMAIL=admin@tudominio.com ADMIN_PASSWORD="una-clave-segura" npm run seed:prod',
    );
    process.exitCode = 1;
    return;
  }
  if ((password as string).length < 8) {
    logger.error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const users = app.get(UsersService);
    const roles = app.get(RolesService);

    // El rol `admin` se siembra en RolesService.onModuleInit; acá solo lo ubicamos.
    const adminRole = (await roles.findAll()).find((r) => r.name === 'admin');
    if (!adminRole) {
      logger.error('No se encontró el rol "admin". ¿La app inicializa los roles por defecto?');
      process.exitCode = 1;
      return;
    }
    const adminRoleId = String(adminRole._id);
    const hashed = await bcrypt.hash(password as string, 10);

    const existing = await users.findByEmail(email as string);
    if (existing) {
      const id = String(existing._id);
      const currentRoles = (existing.roles ?? []).map((r) => String(r));
      if (!currentRoles.includes(adminRoleId)) {
        await users.setRoles(id, [...currentRoles, adminRoleId]);
        logger.log(`El usuario ${email} ya existía; se le asignó el rol admin.`);
      } else {
        logger.log(`El usuario admin ${email} ya existe; nada que hacer.`);
      }
      if (resetPassword) {
        await users.setPassword(id, hashed);
        logger.log('Clave del admin actualizada (ADMIN_RESET_PASSWORD=true).');
      }
      return;
    }

    const admin = await users.create({
      name,
      username,
      email: email as string,
      passwordHash: hashed,
    });
    await users.markEmailVerified(String(admin._id));
    await users.setRoles(String(admin._id), [adminRoleId]);
    logger.log(`Usuario admin creado: ${email} (rol admin, email verificado).`);
  } finally {
    await app.close();
  }
}

seedAdmin()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error('Seed admin falló:', err);
    process.exit(1);
  });
