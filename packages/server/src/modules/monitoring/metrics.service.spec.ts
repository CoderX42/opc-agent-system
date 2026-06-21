import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('aggregates success, errors and latency percentiles', () => {
    service.record('GET /test', 20, false);
    service.record('GET /test', 40, true);
    const summary = service.getSummary();
    expect(summary.requests).toBe(2);
    expect(summary.successRate).toBe(50);
    expect(summary.errorRate).toBe(50);
    expect(summary.averageResponseMs).toBe(30);
    expect(summary.routes[0]).toMatchObject({
      route: 'GET /test',
      requests: 2,
      maxResponseMs: 40,
    });
  });

  it('renders Prometheus-compatible counters', () => {
    service.record('GET /health', 2, false);
    const output = service.toPrometheus();
    expect(output).toContain('opc_http_requests_total{route="GET /health"} 1');
    expect(output).toContain('opc_http_errors_total{route="GET /health"} 0');
  });

  it('returns safe defaults before traffic arrives', () => {
    expect(service.getSummary()).toMatchObject({
      requests: 0,
      successRate: 100,
      errorRate: 0,
      averageResponseMs: 0,
    });
  });
});
