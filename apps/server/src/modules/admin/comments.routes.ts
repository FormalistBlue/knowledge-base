import { AuditAction, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/app-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';

export const adminCommentsRouter = Router();

const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
});
const idParamsSchema = z.object({ id: z.string().trim().min(1) });

const toAdminCommentItem = (
  comment: Prisma.CommentGetPayload<{
    include: {
      user: { select: { id: true; username: true; displayName: true } };
      knowledge: { select: { id: true; title: true } };
    };
  }>,
) => ({
  id: comment.id,
  knowledgeId: comment.knowledgeId,
  parentId: comment.parentId,
  content: comment.content,
  user: comment.user,
  knowledge: comment.knowledge,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  replies: [],
});

adminCommentsRouter.use(requireAuth, requireAdmin);
adminCommentsRouter.get(
  '/',
  validate({ query: listCommentsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, keyword } = req.query as unknown as z.infer<typeof listCommentsQuerySchema>;
    const where: Prisma.CommentWhereInput = {
      deletedAt: null,
      ...(keyword
        ? {
            OR: [
              { content: { contains: keyword, mode: 'insensitive' } },
              { user: { displayName: { contains: keyword, mode: 'insensitive' } } },
              { user: { username: { contains: keyword, mode: 'insensitive' } } },
              { knowledge: { title: { contains: keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, displayName: true } },
          knowledge: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.comment.count({ where }),
    ]);

    sendSuccess(res, {
      items: items.map(toAdminCommentItem),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }),
);

adminCommentsRouter.delete(
  '/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const comment = await prisma.comment.findFirst({ where: { id, deletedAt: null }, include: { knowledge: { select: { id: true, title: true } } } });
    if (!comment) {
      throw new AppError('NOT_FOUND', '评论不存在', 404);
    }

    await prisma.$transaction(async (tx) => {
      const deletedAt = new Date();
      await tx.comment.updateMany({ where: { OR: [{ id }, { parentId: id }], deletedAt: null }, data: { deletedAt } });
      await tx.auditLog.create({
        data: {
          actorId: req.currentUser!.id,
          action: AuditAction.DELETE_COMMENT,
          targetType: 'Comment',
          targetId: id,
          summary: `删除知识评论 ${comment.knowledge.title}`,
          metadata: { knowledgeId: comment.knowledge.id },
        },
      });
    });

    sendSuccess(res, { id });
  }),
);
