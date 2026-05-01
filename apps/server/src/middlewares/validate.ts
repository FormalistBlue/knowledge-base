import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

import { AppError } from '../utils/app-error.js';

type ValidationSchemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

const formatZodError = (error: ZodError) => {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }));
};

export const validate = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        rescopeRequestValue(req, 'query', schemas.query.parse(req.query));
      }

      if (schemas.params) {
        rescopeRequestValue(req, 'params', schemas.params.parse(req.params));
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError('VALIDATION_ERROR', '参数校验失败', 400, formatZodError(error)));
        return;
      }

      next(error);
    }
  };
};

const rescopeRequestValue = (req: object, key: 'query' | 'params', value: unknown) => {
  Object.defineProperty(req, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
};
