import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditLogDto, AuditQueryDto } from './audit.dto';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles('owner', 'admin', 'manager')
  async list(@Req() req: any, @Query() query: AuditQueryDto) {
    const limit = query.limit ? Number(query.limit) : undefined;
    return this.audit.list(req.user.tenantId, { from: query.from, to: query.to, limit });
  }

  @Post('log')
  @Roles('owner', 'admin', 'manager')
  async log(@Req() req: any, @Body() dto: AuditLogDto) {
    return this.audit.log({
      tenantId: req.user.tenantId,
      actorUserId: req.user.sub,
      action: dto.action,
      entity: dto.entity,
      entityId: dto.entityId,
      metadata: dto.metadata,
    });
  }
}
