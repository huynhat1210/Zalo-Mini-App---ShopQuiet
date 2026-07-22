import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string) || crypto.randomUUID();
    const traceId =
      (req.headers['x-trace-id'] as string) || crypto.randomUUID();

    const rawReq = req as any;
    rawReq['request_id'] = requestId;
    rawReq['trace_id'] = traceId;

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-trace-id', traceId);

    next();
  }
}
