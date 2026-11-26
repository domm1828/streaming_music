import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { MailConfig } from '../config/configuration';
import { LogsService } from '../logs/logs.service';
import { SettingsService } from '../settings/settings.service';

interface ResolvedMail {
  transport: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface MailResult {
  ok: boolean;
  error?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    @Optional() private readonly logs?: LogsService,
  ) {}

  async sendEmailVerification(to: string, code: string): Promise<void> {
    await this.send(
      to,
      'Verificá tu cuenta en Stream Music',
      `Tu código de verificación es: ${code}\n\nExpira en 15 minutos.`,
    );
  }

  async sendPasswordReset(to: string, code: string): Promise<void> {
    await this.send(
      to,
      'Restablecé tu contraseña — Stream Music',
      `Tu código para restablecer la contraseña es: ${code}\n\nExpira en 15 minutos. Si no lo solicitaste, ignorá este correo.`,
    );
  }

  async sendNotification(to: string, title: string, body: string): Promise<void> {
    await this.send(to, title, body);
  }

  /** Envía un correo de prueba y devuelve el resultado (sin tragarse el error). */
  async sendTest(to: string): Promise<MailResult> {
    return this.deliver(
      to,
      'Correo de prueba — Stream Music',
      'Si recibiste este correo, la configuración de envío (SMTP) funciona. 🎉',
    );
  }

  /** Envío de uso interno (auth, notificaciones): nunca rompe el flujo si falla. */
  private async send(to: string, subject: string, text: string): Promise<void> {
    const res = await this.deliver(to, subject, text);
    if (!res.ok) this.logger.error(`No se pudo enviar el correo a ${to}: ${res.error}`);
  }

  private async deliver(to: string, subject: string, text: string): Promise<MailResult> {
    const cfg = await this.resolveConfig();

    if (cfg.transport === 'log') {
      this.logger.log(`[mail:log] ${to} — ${subject}`);
      void this.logs?.record('email', `(log) ${to}: ${subject}`, { context: 'mail', to, ok: true });
      return { ok: true };
    }

    if (!cfg.host) {
      const error = 'SMTP no configurado (falta el host)';
      void this.logs?.record('email', `Falló el envío a ${to}: ${error}`, { context: 'mail', to, ok: false, error });
      return { ok: false, error };
    }

    try {
      const transporter = createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      });
      await transporter.sendMail({ from: cfg.from, to, subject, text });
      void this.logs?.record('email', `Enviado a ${to}: ${subject}`, { context: 'mail', to, ok: true });
      return { ok: true };
    } catch (err) {
      const error = (err as Error).message;
      void this.logs?.record('email', `Falló el envío a ${to}: ${subject}`, { context: 'mail', to, ok: false, error });
      return { ok: false, error };
    }
  }

  /** Resuelve la config efectiva de correo: settings en DB con fallback al `.env`. */
  private async resolveConfig(): Promise<ResolvedMail> {
    const envMail = this.config.get<MailConfig>('mail');
    return {
      transport: await this.settings.get<string>('mail.transport', 'smtp'),
      host: await this.settings.get<string>('mail.host', envMail?.host ?? ''),
      port: await this.settings.getNumber('mail.port', envMail?.port ?? 587),
      secure: await this.settings.getBoolean('mail.secure', false),
      user: await this.settings.get<string>('mail.user', ''),
      pass: await this.settings.get<string>('mail.pass', ''),
      from: `${await this.settings.get<string>('mail.fromName', 'Stream Music')} <${await this.settings.get<string>(
        'mail.fromAddress',
        envMail?.from ?? 'no-reply@streammusic.local',
      )}>`,
    };
  }
}
