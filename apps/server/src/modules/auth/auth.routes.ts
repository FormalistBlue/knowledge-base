import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/app-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { signToken } from './jwt.js';
import { hashPassword, verifyPassword } from './password.js';
import { toSafeUser } from './user-presenter.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

authRouter.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findFirst({
      where: {
        username,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new AppError('UNAUTHORIZED', '用户名或密码错误', 401);
    }

    if (user.status === 'DISABLED') {
      throw new AppError('USER_DISABLED', '账号已被禁用', 403);
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError('UNAUTHORIZED', '用户名或密码错误', 401);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({
      sub: updatedUser.id,
      role: updatedUser.role,
      tokenVersion: updatedUser.tokenVersion,
    });

    sendSuccess(res, {
      token,
      user: toSafeUser(updatedUser),
    });
  }),
);

authRouter.post('/logout', requireAuth, (_req, res) => {
  sendSuccess(res, { success: true });
});

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.currentUser!.id },
  });

  sendSuccess(res, { user: toSafeUser(user) });
}));

authRouter.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.currentUser!.id },
    });

    const oldPasswordValid = await verifyPassword(oldPassword, user.passwordHash);
    if (!oldPasswordValid) {
      throw new AppError('UNAUTHORIZED', '原密码错误', 401);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        tokenVersion: { increment: 1 },
      },
    });

    sendSuccess(res, { user: toSafeUser(updatedUser) });
  }),
);
