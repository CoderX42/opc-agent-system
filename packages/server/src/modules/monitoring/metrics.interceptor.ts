import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const startedAt = performance.now();
    let failed = false;
    return next.handle().pipe(
      catchError((error) => {
        failed = true;
        throw error;
      }),
      finalize(() => {
        const route = `${request.method} ${request.route?.path || request.path}`;
        this.metrics.record(route, performance.now() - startedAt, failed);
      }),
    );
  }
}
