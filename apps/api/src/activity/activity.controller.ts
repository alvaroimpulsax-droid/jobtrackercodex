import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { ActivityBatchDto, ActivityQueryDto } from './activity.dto';
import { ActivityService } from './activity.service';

@Controller('activity')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Post('batch')
  async batch(@Req() req: any, @Body() dto: ActivityBatchDto) {
    return this.activity.ingest(req.user.tenantId, req.user.sub, dto.events);
  }

  @Get()
  async list(@Req() req: any, @Query() query: ActivityQueryDto) {
    return this.activity.list(req.user.tenantId, req.user.sub, req.user.role, query);
  }
}
