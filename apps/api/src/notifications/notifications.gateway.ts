import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtConfig } from '../config/configuration';
import type { JwtPayload } from '../auth/types/authenticated-user';

/** Entrega en tiempo real por sala `user:{id}`. El cliente pasa el token en handshake.auth. */
@WebSocketGateway({ namespace: '/rt', cors: { origin: true } })
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const secret = this.config.get<JwtConfig>('jwt')!.accessSecret;
      const payload = this.jwt.verify<JwtPayload>(token, { secret });
      void client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  /** Emite un evento a un usuario conectado (si hay servidor activo). */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
