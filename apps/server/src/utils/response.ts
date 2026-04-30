import type { Response } from 'express';

export type ApiSuccessResponse<T> = {
  code: 0;
  message: string;
  data: T;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  details: unknown | null;
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'ok',
  statusCode = 200,
): void => {
  res.status(statusCode).json({
    code: 0,
    message,
    data,
  } satisfies ApiSuccessResponse<T>);
};
