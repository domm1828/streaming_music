import { BadRequestException, Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { SocialProvider } from './schemas/social-profile.schema';
import { SocialAuthService } from './social-auth.service';
import type { AuthenticatedUser } from './types/authenticated-user';

const PROVIDERS: SocialProvider[] = ['google', 'facebook', 'twitter'];

@Controller('account/social')
@UseGuards(JwtAuthGuard)
export class AccountSocialController {
  constructor(private readonly social: SocialAuthService) {}

  /** Proveedores sociales vinculados a la cuenta actual. */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.social.listForUser(user.id);
  }

  /** Desvincula un proveedor de la cuenta actual. */
  @Delete(':provider')
  async unlink(@CurrentUser() user: AuthenticatedUser, @Param('provider') provider: string) {
    if (!PROVIDERS.includes(provider as SocialProvider)) {
      throw new BadRequestException('Proveedor social desconocido');
    }
    await this.social.unlink(user.id, provider as SocialProvider);
    return { ok: true };
  }
}
