import { IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ActivityEventDto {
  @IsDateString()
  startedAt!: string;

  @IsDateString()
  endedAt!: string;

  @IsString()
  appName!: string;

  @IsOptional()
  @IsString()
  windowTitle?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  idle?: boolean;
}

export class ActivityBatchDto {
  @ValidateNested({ each: true })
  @Type(() => ActivityEventDto)
  events!: ActivityEventDto[];
}

export class ActivityQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
