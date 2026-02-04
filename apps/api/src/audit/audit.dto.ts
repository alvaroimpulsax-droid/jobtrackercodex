import { IsOptional, IsString } from 'class-validator';

export class AuditQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class AuditLogDto {
  @IsString()
  action!: string;

  @IsString()
  entity!: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
