import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ArtistsService } from './catalog/artists.service';
import { AlbumsService } from './catalog/albums.service';
import { TracksService } from './catalog/tracks.service';
import { GenresService } from './catalog/genres.service';
import { PlaylistsService } from './playlists/playlists.service';
import { UsersService } from './users/users.service';
import { RolesService } from './users/roles.service';
import * as bcrypt from 'bcryptjs';

/**
 * Seed idempotente de datos demo: usuarios, catálogo y una playlist.
 * Reusa los servicios de la app vía un contexto standalone de Nest.
 */
async function seed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const users = app.get(UsersService);
    const roles = app.get(RolesService);
    const artists = app.get(ArtistsService);
    const albums = app.get(AlbumsService);
    const tracks = app.get(TracksService);
    const genres = app.get(GenresService);
    const playlists = app.get(PlaylistsService);

    // Usuario admin demo (idempotente por email).
    const adminEmail = 'admin@streammusic.local';
    let admin = await users.findByEmail(adminEmail);
    if (!admin) {
      admin = await users.create({
        name: 'Admin Demo',
        username: 'admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash('Password123!', 10),
      });
      await users.markEmailVerified(String(admin._id));
      const allRoles = await roles.findAll();
      const adminRole = allRoles.find((r) => r.name === 'admin');
      if (adminRole) await users.setRoles(String(admin._id), [String(adminRole._id)]);
      logger.log('Usuario admin creado (admin@streammusic.local / Password123!)');
    }

    const demoEmail = 'demo@streammusic.local';
    if (!(await users.findByEmail(demoEmail))) {
      const demo = await users.create({
        name: 'Usuario Demo',
        username: 'demo',
        email: demoEmail,
        passwordHash: await bcrypt.hash('Password123!', 10),
      });
      await users.markEmailVerified(String(demo._id));
      logger.log('Usuario demo creado (demo@streammusic.local / Password123!)');
    }

    // Catálogo demo (idempotente: si ya existe el género semilla, se omite).
    const existingGenres = await genres.findAll();
    if (existingGenres.some((g) => g.name === 'demo')) {
      logger.log('El catálogo demo ya existe; se omite.');
      return;
    }

    const genre = await genres.create({ name: 'demo', displayName: 'Demo' });
    const demoArtists = [];
    for (const name of ['Aurora Demo', 'Nébula', 'Río Sur']) {
      demoArtists.push(await artists.create({ name, genres: [String(genre._id)] }));
    }

    const demoTracks: string[] = [];
    for (const artist of demoArtists) {
      const album = await albums.create({
        name: `${artist.name} — Vol. 1`,
        artists: [String(artist._id)],
        genres: [String(genre._id)],
      });
      for (let i = 1; i <= 2; i++) {
        const track = await tracks.create(
          {
            name: `${artist.name} Track ${i}`,
            album: String(album._id),
            artists: [String(artist._id)],
            genres: [String(genre._id)],
          },
          undefined,
        );
        demoTracks.push(String(track._id));
      }
    }

    // Playlist demo del admin con algunas pistas.
    if (admin) {
      const pl = await playlists.create(String(admin._id), {
        name: 'Lo mejor del demo',
        description: 'Playlist de ejemplo generada por el seed.',
      });
      await playlists.addTracks(String(pl._id), demoTracks.slice(0, 4), String(admin._id));
    }

    logger.log(`Seed completo: ${demoArtists.length} artistas, ${demoTracks.length} pistas, 1 playlist.`);
  } finally {
    await app.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed falló:', err);
    process.exit(1);
  });
