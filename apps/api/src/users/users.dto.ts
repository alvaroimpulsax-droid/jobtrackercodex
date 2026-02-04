import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @MinLength(8)
  password!: string;

  @IsIn(['owner', 'admin', 'manager', 'employee', 'auditor'])
  role!: Role;

  @IsOptional()
  @IsBoolean()
  canViewOwnHistory?: boolean;
}

export class UserQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @IsOptional()
  @IsIn(['owner', 'admin', 'manager', 'employee', 'auditor'])
  role?: Role;

  @IsOptional()
  @IsBoolean()
  canViewOwnHistory?: boolean;
}
