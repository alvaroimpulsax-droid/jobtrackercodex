import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateRetentionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  timeRetentionDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  activityRetentionDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  screenshotRetentionDays?: number | null;
}

export class UpdateCapturePolicyDto {
  @IsInt()
  @Min(60)
  @Max(3600)
  intervalSeconds!: number;
}
