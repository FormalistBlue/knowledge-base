import type { Request, Response } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from '../utils/logger.js';

export const requestLogger = pinoHttp<Request, Response>({
  logger,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'req.body.password',
      'req.body.token',
    ],
    censor: '[REDACTED]',
  },
  customLogLevel(_req, res, error) {
    if (error || res.statusCode >= 500) {
      return 'error';
    }

    if (res.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  },
});
