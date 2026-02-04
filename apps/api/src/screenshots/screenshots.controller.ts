import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { CompleteScreenshotDto, PresignScreenshotDto, ScreenshotQueryDto } from './screenshots.dto';
import { ScreenshotsService } from './screenshots.service';

@Controller('screenshots')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ScreenshotsController {
  constructor(private readonly screenshots: ScreenshotsService) {}

  @Post('presign')
  async presign(@Req() req: any, @Body() dto: PresignScreenshotDto) {
    return this.screenshots.presign(req.user.tenantId, req.user.sub, dto);
  }

  @Post('complete/:id')
  async complete(@Req() req: any, @Param('id') id: string, @Body() dto: CompleteScreenshotDto) {
    return this.screenshots.complete(req.user.tenantId, req.user.sub, id, dto.sizeBytes);
  }

  @Get()
  async list(@Req() req: any, @Query() query: ScreenshotQueryDto) {
    return this.screenshots.list(req.user.tenantId, req.user.sub, req.user.role, query);
  }
}
