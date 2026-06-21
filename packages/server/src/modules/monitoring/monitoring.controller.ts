import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { MetricsService } from './metrics.service';

@ApiTags('Monitoring')
@Controller()
export class MonitoringController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly metrics: MetricsService,
  ) {}

  @Get('health/ready')
  @ApiOperation({ summary: '依赖就绪检查' })
  async ready() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ready', database: 'up' };
  }

  @Get('metrics/summary')
  summary() {
    return this.metrics.getSummary();
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metricsText() {
    return this.metrics.toPrometheus();
  }
}
