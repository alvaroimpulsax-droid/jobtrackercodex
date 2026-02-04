import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';

@Module({
  imports: [ConfigModule],
  providers: [TenantsService],
  controllers: [TenantsController],
})
export class TenantsModule {}
