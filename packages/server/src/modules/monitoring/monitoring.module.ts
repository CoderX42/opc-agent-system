import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MonitoringModule {}
