import { IsEmail, IsString, MinLength } from 'class-validator';

export class BootstrapTenantDto {
  @IsString()
  tenantName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  ownerName!: string;

  @MinLength(8)
  ownerPassword!: string;
}
