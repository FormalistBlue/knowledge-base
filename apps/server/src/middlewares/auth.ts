import { UserRole, UserStatus } from '@prisma/client';
import type { RequestHandler } from 'express';

import { verifyToken } from '../modules/auth/jwt.js';
import { AppError } from '../utils/app-error.js';
import { prisma } from '../utils/prisma.js';

const parseBearerToken = (authorization?: string): string => {
  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', '请先登录', 401);
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    throw new AppError('UNAUTHORIZED', '请先登录', 401);
  }

  return token;
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = parseBearerToken(req.headers.authorization);
    const payload = verifyToken(token);

    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new AppError('UNAUTHORIZED', '用户不存在或登录状态无效', 401);
    }

    if (user.status === UserStatus.DISABLED) {
      throw new AppError('USER_DISABLED', '账号已被禁用', 403);
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new AppError('TOKEN_REVOKED', '登录状态已失效，请重新登录', 401);
    }

    req.currentUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.currentUser) {
    next(new AppError('UNAUTHORIZED', '请先登录', 401));
    return;
  }

  if (req.currentUser.role !== UserRole.ADMIN) {
    next(new AppError('FORBIDDEN', '需要管理员权限', 403));
    return;
  }

  next();
};
