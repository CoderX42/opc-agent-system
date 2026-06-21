import { Injectable, Logger } from '@nestjs/common';

interface RouteMetric {
  requests: number;
  errors: number;
  totalDurationMs: number;
  maxDurationMs: number;
  durations: number[];
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly routes = new Map<string, RouteMetric>();
  private lastAlertAt = 0;

  record(route: string, durationMs: number, failed: boolean): void {
    const metric = this.routes.get(route) || {
      requests: 0,
      errors: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      durations: [],
    };
    metric.requests += 1;
    metric.errors += failed ? 1 : 0;
    metric.totalDurationMs += durationMs;
    metric.maxDurationMs = Math.max(metric.maxDurationMs, durationMs);
    metric.durations.push(durationMs);
    if (metric.durations.length > 1000) metric.durations.shift();
    this.routes.set(route, metric);
    this.checkThresholds(route, metric);
  }

  getSummary() {
    let requests = 0;
    let errors = 0;
    let totalDurationMs = 0;
    const routes = Array.from(this.routes.entries()).map(([route, metric]) => {
      requests += metric.requests;
      errors += metric.errors;
      totalDurationMs += metric.totalDurationMs;
      const sorted = [...metric.durations].sort((a, b) => a - b);
      return {
        route,
        requests: metric.requests,
        successRate: this.percent(metric.requests - metric.errors, metric.requests),
        errorRate: this.percent(metric.errors, metric.requests),
        averageResponseMs: this.round(metric.totalDurationMs / metric.requests),
        p95ResponseMs: this.round(sorted[Math.floor(sorted.length * 0.95)] || 0),
        maxResponseMs: this.round(metric.maxDurationMs),
      };
    });

    return {
      startedAt: process.uptime(),
      requests,
      successRate: requests ? this.percent(requests - errors, requests) : 100,
      errorRate: requests ? this.percent(errors, requests) : 0,
      averageResponseMs: this.round(totalDurationMs / Math.max(requests, 1)),
      thresholds: { averageResponseMs: 200, errorRatePercent: 5 },
      routes,
    };
  }

  toPrometheus(): string {
    const lines = [
      '# HELP opc_http_requests_total Total HTTP requests',
      '# TYPE opc_http_requests_total counter',
      '# HELP opc_http_errors_total Total failed HTTP requests',
      '# TYPE opc_http_errors_total counter',
      '# HELP opc_http_response_average_ms Average response time',
      '# TYPE opc_http_response_average_ms gauge',
    ];
    for (const [route, metric] of this.routes) {
      const label = route.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      lines.push(`opc_http_requests_total{route="${label}"} ${metric.requests}`);
      lines.push(`opc_http_errors_total{route="${label}"} ${metric.errors}`);
      lines.push(
        `opc_http_response_average_ms{route="${label}"} ${this.round(metric.totalDurationMs / metric.requests)}`,
      );
    }
    return `${lines.join('\n')}\n`;
  }

  private checkThresholds(route: string, metric: RouteMetric): void {
    if (metric.requests < 20 || Date.now() - this.lastAlertAt < 60_000) return;
    const average = metric.totalDurationMs / metric.requests;
    const errorRate = (metric.errors / metric.requests) * 100;
    if (average > 200 || errorRate > 5) {
      this.lastAlertAt = Date.now();
      this.logger.warn(
        `ALERT route=${route} avg=${this.round(average)}ms errorRate=${this.round(errorRate)}%`,
      );
    }
  }

  private percent(value: number, total: number): number {
    return this.round(total ? (value / total) * 100 : 100);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
