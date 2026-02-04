import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScreenshotsService } from './screenshots.service';
import { ScreenshotsController } from './screenshots.controller';

@Module({
  imports: [ConfigModule],
  providers: [ScreenshotsService],
  controllers: [ScreenshotsController],
})
export class ScreenshotsModule {}
