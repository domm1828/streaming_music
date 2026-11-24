import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import configuration from '../config/configuration';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { ApiTokensService } from './api-tokens.service';

function isAuthResult(r: unknown): r is { user: { id: string } } {
  return typeof r === 'object' && r !== null && 'user' in r;
}

describe('Cuenta: cambio de contraseña, sesiones y borrado (e2e, in-memory)', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let auth: AuthService;
  let tokens: TokensService;
  let apiTokens: ApiTokensService;
  let users: UsersService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongooseModule.forRoot(mongod.getUri()),
        MailModule,
        UsersModule,
        AuthModule,
      ],
    }).compile();
    auth = moduleRef.get(AuthService);
    tokens = moduleRef.get(TokensService);
    apiTokens = moduleRef.get(ApiTokensService);
    users = moduleRef.get(UsersService);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongod?.stop();
  });

  async function newUser(suffix: string) {
    const res = await auth.register(
      { name: 'Test', username: `user_${suffix}`, email: `${suffix}@example.com`, password: 'Password123!' },
      {},
    );
    return res.user.id;
  }

  it('cambia la contraseña verificando la actual', async () => {
    const id = await newUser('chpw');
    await expect(auth.changePassword(id, 'wrong-pass', 'NewPass123!')).rejects.toThrow();
    await auth.changePassword(id, 'Password123!', 'NewPass123!');

    const ok = await auth.login({ email: 'chpw@example.com', password: 'NewPass123!' }, {});
    expect(isAuthResult(ok)).toBe(true);
    await expect(auth.login({ email: 'chpw@example.com', password: 'Password123!' }, {})).rejects.toThrow();
  });

  it('cierra las demás sesiones conservando la actual', async () => {
    const id = await newUser('sess'); // register ya deja 1 sesión
    const keep = await tokens.issueRefreshToken(id, {});
    await tokens.issueRefreshToken(id, {});
    await tokens.issueRefreshToken(id, {});
    expect(await tokens.listSessions(id)).toHaveLength(4);

    await tokens.revokeOthers(id, keep);
    const left = await tokens.listSessions(id);
    expect(left).toHaveLength(1);
    // La sesión conservada sigue siendo válida (puede rotar).
    await expect(tokens.rotate(keep, {})).resolves.toHaveProperty('refreshToken');
  });

  it('crea, resuelve y revoca tokens de API personales', async () => {
    const id = await newUser('tok');
    const created = await apiTokens.create(id, 'CLI');
    expect(created.token).toMatch(/^sm_/);

    expect(await apiTokens.resolveUserId(created.token)).toBe(id);
    expect(await apiTokens.resolveUserId('sm_inexistente')).toBeNull();
    expect(await apiTokens.resolveUserId('no-es-token')).toBeNull();

    const list = await apiTokens.list(id);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('CLI');

    await apiTokens.revoke(id, created.id);
    expect(await apiTokens.resolveUserId(created.token)).toBeNull();
    expect(await apiTokens.list(id)).toHaveLength(0);
  });

  it('borra la cuenta verificando la contraseña y revoca sus sesiones', async () => {
    const id = await newUser('del');
    await tokens.issueRefreshToken(id, {});
    await expect(auth.deleteAccount(id, 'wrong-pass')).rejects.toThrow();

    await auth.deleteAccount(id, 'Password123!');
    expect(await users.getAuthenticatedUser(id)).toBeNull();
    expect(await tokens.listSessions(id)).toHaveLength(0);
  });
});
