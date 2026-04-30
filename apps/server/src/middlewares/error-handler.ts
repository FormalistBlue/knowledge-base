import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    logger.warn(
      {
        err: error,
        method: req.method,
        path: req.path,
        statusCode: error.statusCode,
      },
      'handled application error',
    );

    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details ?? null,
    });
    return;
  }

  if (error instanceof ZodError) {
    logger.warn(
      {
        err: error,
        method: req.method,
        path: req.path,
      },
      'validation error',
    );

    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: '参数校验失败',
      details: error.issues,
    });
    return;
  }

  logger.error(
    {
      err: error,
      method: req.method,
      path: req.path,
    },
    'unexpected server error',
  );

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: '服务端异常',
    details: null,
  });
};
