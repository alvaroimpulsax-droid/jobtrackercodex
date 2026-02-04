import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { RegisterDeviceDto } from './devices.dto';
import { DevicesService } from './devices.service';

@Controller('devices')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post('register')
  async register(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(req.user.tenantId, req.user.sub, dto);
  }
}
