import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    const rawReq = request as any;
    const requestId = rawReq['request_id'] || '';
    const traceId = rawReq['trace_id'] || '';

    return next.handle().pipe(
      map((value) => {
        // If it's already a wrapped success response, just return it
        if (
          value &&
          typeof value === 'object' &&
          'data' in value &&
          'meta' in value &&
          'message' in value
        ) {
          return value;
        }

        // Check if there is pagination info
        const hasPagination =
          value &&
          typeof value === 'object' &&
          ('pagination' in value || 'meta' in value) &&
          (value.pagination || value.meta) &&
          typeof (value.pagination || value.meta) === 'object';

        let data = value;
        let pagination: any = undefined;

        if (hasPagination) {
          data = value.data;
          const pagSource = value.pagination || value.meta;
          pagination = {
            total: pagSource.total !== undefined ? Number(pagSource.total) : 0,
            page: pagSource.page !== undefined ? Number(pagSource.page) : 1,
            limit: pagSource.limit !== undefined ? Number(pagSource.limit) : 10,
            total_pages:
              pagSource.total_pages !== undefined
                ? Number(pagSource.total_pages)
                : pagSource.totalPages !== undefined
                  ? Number(pagSource.totalPages)
                  : 1,
          };
        }

        return {
          message:
            (value && typeof value === 'object' && value.message) ||
            'Request successful',
          data:
            data && typeof data === 'object' && 'data' in data && !hasPagination
              ? data.data
              : data,
          meta: {
            request_id: requestId,
            trace_id: traceId,
          },
          ...(pagination && { pagination }),
        };
      }),
    );
  }
}
