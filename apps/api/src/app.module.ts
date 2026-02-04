import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { TimeModule } from './time/time.module';
import { ActivityModule } from './activity/activity.module';
import { PoliciesModule } from './policies/policies.module';
import { ScreenshotsModule } from './screenshots/screenshots.module';
import { AuditModule } from './audit/audit.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    TimeModule,
    ActivityModule,
    PoliciesModule,
    ScreenshotsModule,
    AuditModule,
    DevicesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
