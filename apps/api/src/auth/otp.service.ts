import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { OtpCode, OtpCodeDocument, OtpPurpose } from './schemas/otp-code.schema';

const OTP_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class OtpService {
  constructor(@InjectModel(OtpCode.name) private readonly otpModel: Model<OtpCodeDocument>) {}

  /** Genera un código de 6 dígitos, invalida los previos del mismo propósito y lo devuelve en claro. */
  async generate(userId: string, purpose: OtpPurpose): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);
    await this.otpModel.updateMany(
      { user: new Types.ObjectId(userId), purpose, consumedAt: null },
      { consumedAt: new Date() },
    );
    await this.otpModel.create({
      user: new Types.ObjectId(userId),
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });
    return code;
  }

  /** Verifica el código y lo marca como consumido si es válido. */
  async verifyAndConsume(userId: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const record = await this.otpModel
      .findOne({
        user: new Types.ObjectId(userId),
        purpose,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
    if (!record) return false;
    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) return false;
    record.consumedAt = new Date();
    await record.save();
    return true;
  }
}
