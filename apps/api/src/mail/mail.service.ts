import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import type { MailConfig } from '../config/configuration';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly logs?: LogsService,
  ) {
    const mail = this.config.get<MailConfig>('mail')!;
    this.from = mail.from;
    this.transporter = createTransport({
      host: mail.host,
      port: mail.port,
      secure: false,
      ignoreTLS: true,
    });
  }

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

  private async send(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
      void this.logs?.record('email', `Enviado a ${to}: ${subject}`, { context: 'mail', to, ok: true });
    } catch (err) {
      // No romper el flujo de auth si el correo falla; se registra para diagnóstico.
      const msg = (err as Error).message;
      this.logger.error(`No se pudo enviar el correo a ${to}: ${msg}`);
      void this.logs?.record('email', `Falló el envío a ${to}: ${subject}`, { context: 'mail', to, ok: false, error: msg });
    }
  }
}
