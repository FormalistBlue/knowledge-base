import { AuditAction, UserRole, UserStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/app-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { hashPassword } from '../auth/password.js';
import { toSafeUser } from '../auth/user-presenter.js';

export const adminUsersRouter = Router();

const createUserSchema = z.object({
  username: z.string().trim().min(2).max(50),
  displayName: z.string().trim().min(1).max(50),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).default(UserRole.USER),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

adminUsersRouter.use(requireAuth, requireAdmin);

adminUsersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, { users: users.map(toSafeUser) });
  }),
);

adminUsersRouter.post(
  '/',
  validate({ body: createUserSchema }),
  asyncHandler(async (req, res) => {
    const { username, displayName, password, role } = req.body as z.infer<typeof createUserSchema>;

    const existing = await prisma.user.findFirst({
      where: {
        username,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new AppError('CONFLICT', '用户名已存在', 409);
    }

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        role,
        passwordHash: await hashPassword(password),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.currentUser!.id,
        action: AuditAction.CREATE_USER,
        targetType: 'User',
        targetId: user.id,
        summary: `创建用户 ${user.username}`,
        metadata: { username: user.username, role: user.role },
      },
    });

    sendSuccess(res, { user: toSafeUser(user) }, 'created', 201);
  }),
);

adminUsersRouter.patch(
  '/:id/status',
  validate({ params: idParamsSchema, body: updateStatusSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { status } = req.body as z.infer<typeof updateStatusSchema>;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', '用户不存在', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status,
        tokenVersion: status === UserStatus.DISABLED ? { increment: 1 } : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.currentUser!.id,
        action: status === UserStatus.DISABLED ? AuditAction.DISABLE_USER : AuditAction.ENABLE_USER,
        targetType: 'User',
        targetId: updatedUser.id,
        summary: `${status === UserStatus.DISABLED ? '禁用' : '启用'}用户 ${updatedUser.username}`,
        metadata: { username: updatedUser.username, status },
      },
    });

    sendSuccess(res, { user: toSafeUser(updatedUser) });
  }),
);

adminUsersRouter.post(
  '/:id/reset-password',
  validate({ params: idParamsSchema, body: resetPasswordSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { password } = req.body as z.infer<typeof resetPasswordSchema>;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', '用户不存在', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(password),
        tokenVersion: { increment: 1 },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.currentUser!.id,
        action: AuditAction.RESET_PASSWORD,
        targetType: 'User',
        targetId: updatedUser.id,
        summary: `重置用户 ${updatedUser.username} 的密码`,
        metadata: { username: updatedUser.username },
      },
    });

    sendSuccess(res, { user: toSafeUser(updatedUser) });
  }),
);
