import { AuditAction, UserRole, UserStatus, type Prisma } from '@prisma/client';
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

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

adminUsersRouter.use(requireAuth, requireAdmin);

adminUsersRouter.get(
  '/',
  validate({ query: listUsersQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, keyword, role, status } = req.query as unknown as z.infer<typeof listUsersQuerySchema>;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { username: { contains: keyword, mode: 'insensitive' } },
              { displayName: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, {
      items: users.map(toSafeUser),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
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

    if (status === UserStatus.DISABLED && user.role === UserRole.ADMIN) {
      if (user.id === req.currentUser!.id) {
        throw new AppError('VALIDATION_ERROR', '不能禁用自己的管理员账号', 400);
      }

      const activeAdminCount = await prisma.user.count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE, deletedAt: null },
      });
      if (activeAdminCount <= 1) {
        throw new AppError('VALIDATION_ERROR', '不能禁用最后一个可用管理员', 400);
      }
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
    const { newPassword } = req.body as z.infer<typeof resetPasswordSchema>;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', '用户不存在', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(newPassword),
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
