import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
