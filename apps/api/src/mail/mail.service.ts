import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import type { MailConfig } from '../config/configuration';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
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

  private async send(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text });
    } catch (err) {
      // No romper el flujo de auth si el correo falla; se registra para diagnóstico.
      this.logger.error(`No se pudo enviar el correo a ${to}: ${(err as Error).message}`);
    }
  }
}
