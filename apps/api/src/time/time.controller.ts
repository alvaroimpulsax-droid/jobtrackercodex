import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { StartTimeDto, StopTimeDto, TimeQueryDto } from './time.dto';
import { TimeService } from './time.service';

@Controller('time')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TimeController {
  constructor(private readonly time: TimeService) {}

  @Post('start')
  async start(@Req() req: any, @Body() dto: StartTimeDto) {
    return this.time.start(req.user.tenantId, req.user.sub, dto);
  }

  @Post('stop')
  async stop(@Req() req: any, @Body() dto: StopTimeDto) {
    return this.time.stop(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  async list(@Req() req: any, @Query() query: TimeQueryDto) {
    return this.time.list(req.user.tenantId, req.user.sub, req.user.role, query);
  }
}
