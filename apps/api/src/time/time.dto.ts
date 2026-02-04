import { IsDateString, IsOptional, IsString } from 'class-validator';

export class StartTimeDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;
}

export class StopTimeDto {
  @IsOptional()
  @IsDateString()
  endedAt?: string;
}

export class TimeQueryDto {
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
