import { Body, Controller, ForbiddenException, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantsService } from './tenants.service';
import { BootstrapTenantDto } from './tenants.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService, private readonly config: ConfigService) {}

  @Post('bootstrap')
  async bootstrap(@Headers('x-bootstrap-secret') secret: string | undefined, @Body() dto: BootstrapTenantDto) {
    const expected = this.config.get('BOOTSTRAP_SECRET');
    if (!expected || expected !== secret) {
      throw new ForbiddenException('Invalid bootstrap secret');
    }
    return this.tenants.bootstrapTenant(secret, dto);
  }
}
