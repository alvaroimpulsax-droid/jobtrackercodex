import { IsDateString, IsOptional, IsString } from 'class-validator';

export class PresignScreenshotDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsDateString()
  takenAt?: string;
}

export class CompleteScreenshotDto {
  @IsOptional()
  sizeBytes?: number;
}

export class ScreenshotQueryDto {
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
