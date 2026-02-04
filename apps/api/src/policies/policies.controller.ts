import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateCapturePolicyDto, UpdateRetentionDto } from './policies.dto';
import { PoliciesService } from './policies.service';

@Controller('policies')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Get('retention')
  @Roles('owner', 'admin')
  async getRetention(@Req() req: any) {
    return this.policies.getRetention(req.user.tenantId);
  }

  @Patch('retention')
  @Roles('owner', 'admin')
  async updateRetention(@Req() req: any, @Body() dto: UpdateRetentionDto) {
    return this.policies.updateRetention(req.user.tenantId, req.user.sub, dto);
  }

  @Get('capture/:userId')
  @Roles('owner', 'admin', 'manager')
  async getCapture(@Req() req: any, @Param('userId') userId: string) {
    return this.policies.getCapturePolicy(req.user.tenantId, userId);
  }

  @Patch('capture/:userId')
  @Roles('owner', 'admin', 'manager')
  async setCapture(@Req() req: any, @Param('userId') userId: string, @Body() dto: UpdateCapturePolicyDto) {
    return this.policies.setCapturePolicy(req.user.tenantId, req.user.sub, userId, dto.intervalSeconds);
  }
}
