import { UserRole } from '@prisma/client';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';

export type AuthTokenPayload = {
  sub: string;
  role: UserRole;
  tokenVersion: number;
};

const tokenPayloadSchema = (payload: string | jwt.JwtPayload): AuthTokenPayload => {
  if (typeof payload === 'string') {
    throw new AppError('UNAUTHORIZED', '登录状态无效或已过期', 401);
  }

  if (
    typeof payload.sub !== 'string' ||
    !Object.values(UserRole).includes(payload.role as UserRole) ||
    typeof payload.tokenVersion !== 'number'
  ) {
    throw new AppError('UNAUTHORIZED', '登录状态无效或已过期', 401);
  }

  return {
    sub: payload.sub,
    role: payload.role as UserRole,
    tokenVersion: payload.tokenVersion,
  };
};

export const signToken = (payload: AuthTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): AuthTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return tokenPayloadSchema(payload);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('UNAUTHORIZED', '登录状态无效或已过期', 401);
  }
};
