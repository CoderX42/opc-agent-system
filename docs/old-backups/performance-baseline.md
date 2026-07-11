# Performance baseline

Date: 2026-06-20  
Target: authenticated `GET /api/finance/summary`  
Tool: autocannon 8, 100 connections, pipeline 10, duration 10 seconds  
Runtime: local macOS, Node.js 24, PostgreSQL in Docker

| Version | Average latency | Requests/sec | Errors |
|---|---:|---:|---:|
| Before JWT/summary cache | 281.65 ms | 3,500.3 | 0 |
| After JWT/summary cache | 75.70 ms | 13,088.1 | 0 |
| Improvement | -73.1% | +273.9% | — |

The optimized result passes the project targets of average latency below 200 ms
and throughput above 1,000 requests/sec for this endpoint. The maximum observed
latency was 4,654 ms during warm-up; production SLOs should therefore track p95
and p99 as well as the average.

Re-run after starting the API and obtaining an access token:

```bash
npx autocannon@8 -c 100 -d 10 -p 10 \
  -H "Authorization=Bearer $TOKEN" \
  http://127.0.0.1:3100/api/finance/summary
```

Runtime metrics are available from `/api/metrics/summary` and `/api/metrics`.
An application warning is emitted when a route has at least 20 samples and its
average exceeds 200 ms or its error rate exceeds 5%.
