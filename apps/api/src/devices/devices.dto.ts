import { IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  deviceName!: string;

  @IsString()
  platform!: string;
}
