import { AuditAction } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/app-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { normalizeTagName, toTagResponse } from './tag-presenter.js';

export const tagsRouter = Router();
export const adminTagsRouter = Router();

const tagBodySchema = z.object({
  name: z.string().trim().min(1).max(30),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

tagsRouter.use(requireAuth);
tagsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const tags = await prisma.tag.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: 'asc' }],
    });

    sendSuccess(res, { tags: tags.map(toTagResponse) });
  }),
);

tagsRouter.post(
  '/',
  validate({ body: tagBodySchema }),
  asyncHandler(async (req, res) => {
    const { name } = req.body as z.infer<typeof tagBodySchema>;
    const normalizedName = normalizeTagName(name);
    const displayName = name.trim();

    const existing = await prisma.tag.findUnique({ where: { normalizedName } });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await prisma.tag.update({
          where: { id: existing.id },
          data: { name: displayName, createdById: req.currentUser!.id, deletedAt: null },
        });
        sendSuccess(res, { tag: toTagResponse(restored) }, 'created', 201);
        return;
      }

      sendSuccess(res, { tag: toTagResponse(existing) });
      return;
    }

    const tag = await prisma.tag.create({
      data: {
        name: displayName,
        normalizedName,
        createdById: req.currentUser!.id,
      },
    });

    sendSuccess(res, { tag: toTagResponse(tag) }, 'created', 201);
  }),
);

adminTagsRouter.use(requireAuth, requireAdmin);
adminTagsRouter.put(
  '/:id',
  validate({ params: idParamsSchema, body: tagBodySchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { name } = req.body as z.infer<typeof tagBodySchema>;
    const normalizedName = normalizeTagName(name);
    const displayName = name.trim();

    const tag = await prisma.tag.findFirst({ where: { id, deletedAt: null } });
    if (!tag) {
      throw new AppError('NOT_FOUND', '标签不存在', 404);
    }

    const duplicate = await prisma.tag.findFirst({
      where: { id: { not: id }, normalizedName },
    });
    if (duplicate) {
      throw new AppError('CONFLICT', duplicate.deletedAt ? '标签名称与已删除标签冲突，请重新创建或使用其他名称' : '标签名称已存在', 409);
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: { name: displayName, normalizedName },
    });

    sendSuccess(res, { tag: toTagResponse(updatedTag) });
  }),
);

adminTagsRouter.delete(
  '/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;

    const tag = await prisma.tag.findFirst({ where: { id, deletedAt: null } });
    if (!tag) {
      throw new AppError('NOT_FOUND', '标签不存在', 404);
    }

    await prisma.$transaction([
      prisma.knowledgeTag.deleteMany({ where: { tagId: id } }),
      prisma.tag.update({ where: { id }, data: { deletedAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          actorId: req.currentUser!.id,
          action: AuditAction.DELETE_TAG,
          targetType: 'Tag',
          targetId: id,
          summary: `删除标签 ${tag.name}`,
          metadata: { name: tag.name, normalizedName: tag.normalizedName },
        },
      }),
    ]);

    sendSuccess(res, { id });
  }),
);
