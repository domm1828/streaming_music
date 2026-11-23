import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'username solo admite letras, números, punto y guion bajo',
  })
  username!: string;

  @IsEmail({}, { message: 'email debe ser un correo válido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'email debe ser un correo válido' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
