import { AttachmentStatus, AuditAction, KnowledgeStatus, NotificationType, Prisma, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/app-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import type { CurrentUser } from '../../types/express.js';
import { toKnowledgeDetail, toKnowledgeSummary } from './knowledge-presenter.js';

export const knowledgeRouter = Router();
export const adminKnowledgeRouter = Router();

const tagIdsSchema = z.array(z.string().trim().min(1)).default([]);

const attachmentIdsSchema = z.array(z.string().trim().min(1)).default([]);

const knowledgeBodySchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1),
  status: z.enum([KnowledgeStatus.DRAFT, KnowledgeStatus.PUBLISHED]),
  categoryId: z.string().trim().min(1),
  tagIds: tagIdsSchema,
  attachmentIds: attachmentIdsSchema,
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  categoryId: z.string().trim().min(1).optional(),
  tagIds: z
    .string()
    .trim()
    .optional()
    .transform((value) => value?.split(',').map((item) => item.trim()).filter(Boolean) ?? []),
  status: z.nativeEnum(KnowledgeStatus).optional(),
  sortBy: z.enum(['publishedAt', 'viewCount', 'updatedAt']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  onlyMine: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

const idParamsSchema = z.object({ id: z.string().trim().min(1) });
const statusBodySchema = z.object({ status: z.nativeEnum(KnowledgeStatus) });
const pinBodySchema = z.object({ isPinned: z.boolean() });
const categoryBodySchema = z.object({ categoryId: z.string().trim().min(1) });
const tagsBodySchema = z.object({ tagIds: tagIdsSchema });

const relationInclude = {
  category: true,
  author: { select: { id: true, username: true, displayName: true } },
  tags: { include: { tag: true }, orderBy: { createdAt: 'asc' as const } },
  likes: true,
  favorites: true,
  comments: { where: { deletedAt: null } },
  attachments: { where: { deletedAt: null } },
};

const ensureCategoryExists = async (categoryId: string) => {
  const category = await prisma.category.findFirst({ where: { id: categoryId, deletedAt: null } });
  if (!category) {
    throw new AppError('NOT_FOUND', '分类不存在', 404);
  }
};

const ensureTagsExist = async (tagIds: string[]) => {
  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length === 0) {
    return uniqueTagIds;
  }

  const tags = await prisma.tag.findMany({ where: { id: { in: uniqueTagIds }, deletedAt: null }, select: { id: true } });
  if (tags.length !== uniqueTagIds.length) {
    throw new AppError('NOT_FOUND', '标签不存在', 404);
  }
  return uniqueTagIds;
};

const ensureTempAttachmentsExist = async (attachmentIds: string[], uploaderId: string) => {
  const uniqueAttachmentIds = [...new Set(attachmentIds)];
  if (uniqueAttachmentIds.length === 0) {
    return uniqueAttachmentIds;
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      id: { in: uniqueAttachmentIds },
      uploaderId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (attachments.length !== uniqueAttachmentIds.length) {
    throw new AppError('NOT_FOUND', '附件不存在或无权绑定', 404);
  }
  return uniqueAttachmentIds;
};

const canManageKnowledge = (knowledge: { authorId: string }, user: CurrentUser) => {
  return user.role === UserRole.ADMIN || knowledge.authorId === user.id;
};

const getKnowledgeOrThrow = async (id: string) => {
  const knowledge = await prisma.knowledgeItem.findFirst({ where: { id, deletedAt: null } });
  if (!knowledge) {
    throw new AppError('NOT_FOUND', '知识不存在', 404);
  }
  return knowledge;
};

const assertCanManageKnowledge = (knowledge: { authorId: string }, user: CurrentUser) => {
  if (!canManageKnowledge(knowledge, user)) {
    throw new AppError('FORBIDDEN', '只能维护自己的知识内容', 403);
  }
};

const bindAttachments = async ({
  tx,
  knowledgeId,
  attachmentIds,
  uploaderId,
}: {
  tx: Prisma.TransactionClient;
  knowledgeId: string;
  attachmentIds: string[];
  uploaderId: string;
}) => {
  const uniqueAttachmentIds = await ensureTempAttachmentsExist(attachmentIds, uploaderId);
  const now = new Date();

  await tx.attachment.updateMany({
    where: { knowledgeId, id: { notIn: uniqueAttachmentIds }, deletedAt: null },
    data: { knowledgeId: null, status: AttachmentStatus.TEMP, boundAt: null },
  });

  if (uniqueAttachmentIds.length > 0) {
    await tx.attachment.updateMany({
      where: { id: { in: uniqueAttachmentIds }, uploaderId, deletedAt: null },
      data: { knowledgeId, status: AttachmentStatus.BOUND, boundAt: now },
    });
  }
};

const timestampsForStatus = (nextStatus: KnowledgeStatus, current?: { publishedAt: Date | null }) => {
  const now = new Date();
  return {
    publishedAt: nextStatus === KnowledgeStatus.PUBLISHED && !current?.publishedAt ? now : current?.publishedAt,
    archivedAt: nextStatus === KnowledgeStatus.ARCHIVED ? now : null,
  };
};

const createNotificationForAuthor = async ({
  knowledgeId,
  authorId,
  title,
  content,
}: {
  knowledgeId: string;
  authorId: string;
  title: string;
  content: string;
}) => {
  await prisma.notification.create({
    data: {
      userId: authorId,
      type: NotificationType.KNOWLEDGE_UPDATED_BY_ADMIN,
      title,
      content,
      relatedType: 'KnowledgeItem',
      relatedId: knowledgeId,
    },
  });
};

const writeAuditLog = async ({
  actorId,
  action,
  targetId,
  summary,
  metadata,
}: {
  actorId: string;
  action: AuditAction;
  targetId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}) => {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType: 'KnowledgeItem',
      targetId,
      summary,
      metadata,
    },
  });
};

knowledgeRouter.use(requireAuth);
knowledgeRouter.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const currentUser = req.currentUser!;
    const { page, pageSize, keyword, categoryId, tagIds, status, sortBy, sortOrder, onlyMine } =
      req.query as unknown as z.infer<typeof listQuerySchema>;

    const where: Prisma.KnowledgeItemWhereInput = {
      deletedAt: null,
      ...(onlyMine ? { authorId: currentUser.id } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { content: { contains: keyword, mode: 'insensitive' } },
              { tags: { some: { tag: { name: { contains: keyword, mode: 'insensitive' }, deletedAt: null } } } },
            ],
          }
        : {}),
      ...(tagIds.length > 0 ? { tags: { some: { tagId: { in: tagIds } } } } : {}),
    };

    if (onlyMine || currentUser.role === UserRole.ADMIN) {
      if (status) {
        where.status = status;
      }
    } else {
      where.status = status === KnowledgeStatus.ARCHIVED ? KnowledgeStatus.ARCHIVED : KnowledgeStatus.PUBLISHED;
    }

    const [items, total] = await prisma.$transaction([
      prisma.knowledgeItem.findMany({
        where,
        include: relationInclude,
        orderBy: [{ isPinned: 'desc' }, { [sortBy]: sortOrder }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.knowledgeItem.count({ where }),
    ]);

    sendSuccess(res, {
      items: items.map(toKnowledgeSummary),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }),
);

knowledgeRouter.get(
  '/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const currentUser = req.currentUser!;
    const knowledge = await prisma.knowledgeItem.findFirst({ where: { id, deletedAt: null }, include: relationInclude });

    if (!knowledge) {
      throw new AppError('NOT_FOUND', '知识不存在', 404);
    }

    if (knowledge.status === KnowledgeStatus.DRAFT && !canManageKnowledge(knowledge, currentUser)) {
      throw new AppError('NOT_FOUND', '知识不存在', 404);
    }

    sendSuccess(res, { knowledge: toKnowledgeDetail(knowledge, currentUser.id) });
  }),
);

knowledgeRouter.post(
  '/',
  validate({ body: knowledgeBodySchema }),
  asyncHandler(async (req, res) => {
    const currentUser = req.currentUser!;
    const { title, summary, content, status, categoryId, tagIds, attachmentIds } = req.body as z.infer<typeof knowledgeBodySchema>;
    await ensureCategoryExists(categoryId);
    const uniqueTagIds = await ensureTagsExist(tagIds);
    const timestamps = timestampsForStatus(status);

    const knowledge = await prisma.$transaction(async (tx) => {
      const createdKnowledge = await tx.knowledgeItem.create({
        data: {
          title,
          summary,
          content,
          status,
          categoryId,
          authorId: currentUser.id,
          publishedAt: timestamps.publishedAt,
          archivedAt: timestamps.archivedAt,
          tags: { create: uniqueTagIds.map((tagId) => ({ tagId })) },
        },
      });
      await bindAttachments({ tx, knowledgeId: createdKnowledge.id, attachmentIds, uploaderId: currentUser.id });
      return tx.knowledgeItem.findUniqueOrThrow({ where: { id: createdKnowledge.id }, include: relationInclude });
    });

    sendSuccess(res, { knowledge: toKnowledgeDetail(knowledge, currentUser.id) }, 'created', 201);
  }),
);

knowledgeRouter.put(
  '/:id',
  validate({ params: idParamsSchema, body: knowledgeBodySchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const currentUser = req.currentUser!;
    const { title, summary, content, status, categoryId, tagIds, attachmentIds } = req.body as z.infer<typeof knowledgeBodySchema>;
    const knowledge = await getKnowledgeOrThrow(id);
    assertCanManageKnowledge(knowledge, currentUser);
    await ensureCategoryExists(categoryId);
    const uniqueTagIds = await ensureTagsExist(tagIds);
    const timestamps = timestampsForStatus(status, knowledge);

    const updatedKnowledge = await prisma.$transaction(async (tx) => {
      await tx.knowledgeTag.deleteMany({ where: { knowledgeId: id } });
      await bindAttachments({ tx, knowledgeId: id, attachmentIds, uploaderId: currentUser.id });
      return tx.knowledgeItem.update({
        where: { id },
        data: {
          title,
          summary,
          content,
          status,
          categoryId,
          publishedAt: timestamps.publishedAt,
          archivedAt: timestamps.archivedAt,
          tags: { create: uniqueTagIds.map((tagId) => ({ tagId })) },
        },
        include: relationInclude,
      });
    });

    sendSuccess(res, { knowledge: toKnowledgeDetail(updatedKnowledge, currentUser.id) });
  }),
);

knowledgeRouter.delete(
  '/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const currentUser = req.currentUser!;
    const knowledge = await getKnowledgeOrThrow(id);
    assertCanManageKnowledge(knowledge, currentUser);

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeItem.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.comment.updateMany({ where: { knowledgeId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      await tx.attachment.updateMany({ where: { knowledgeId: id, deletedAt: null }, data: { deletedAt: new Date() } });
      if (currentUser.role === UserRole.ADMIN) {
        await tx.auditLog.create({
          data: {
            actorId: currentUser.id,
            action: AuditAction.DELETE_KNOWLEDGE,
            targetType: 'KnowledgeItem',
            targetId: id,
            summary: `删除知识 ${knowledge.title}`,
            metadata: { title: knowledge.title },
          },
        });
      }
    });

    sendSuccess(res, { id });
  }),
);

knowledgeRouter.patch(
  '/:id/status',
  validate({ params: idParamsSchema, body: statusBodySchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { status } = req.body as z.infer<typeof statusBodySchema>;
    const currentUser = req.currentUser!;
    const knowledge = await getKnowledgeOrThrow(id);
    assertCanManageKnowledge(knowledge, currentUser);
    const timestamps = timestampsForStatus(status, knowledge);

    const updatedKnowledge = await prisma.knowledgeItem.update({
      where: { id },
      data: { status, publishedAt: timestamps.publishedAt, archivedAt: timestamps.archivedAt },
      include: relationInclude,
    });

    sendSuccess(res, { knowledge: toKnowledgeDetail(updatedKnowledge, currentUser.id) });
  }),
);

adminKnowledgeRouter.use(requireAuth, requireAdmin);
adminKnowledgeRouter.patch(
  '/:id/pin',
  validate({ params: idParamsSchema, body: pinBodySchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { isPinned } = req.body as z.infer<typeof pinBodySchema>;
    const knowledge = await getKnowledgeOrThrow(id);
    const updatedKnowledge = await prisma.knowledgeItem.update({ where: { id }, data: { isPinned }, include: relationInclude });
    await writeAuditLog({
      actorId: req.currentUser!.id,
      action: AuditAction.PIN_KNOWLEDGE,
      targetId: id,
      summary: `${isPinned ? '置顶' : '取消置顶'}知识 ${knowledge.title}`,
      metadata: { isPinned },
    });
    sendSuccess(res, { knowledge: toKnowledgeDetail(updatedKnowledge, req.currentUser!.id) });
  }),
);

adminKnowledgeRouter.patch(
  '/:id/category',
  validate({ params: idParamsSchema, body: categoryBodySchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { categoryId } = req.body as z.infer<typeof categoryBodySchema>;
    const knowledge = await getKnowledgeOrThrow(id);
    await ensureCategoryExists(categoryId);
    const updatedKnowledge = await prisma.knowledgeItem.update({ where: { id }, data: { categoryId }, include: relationInclude });
    await createNotificationForAuthor({
      knowledgeId: id,
      authorId: knowledge.authorId,
      title: '知识分类已被管理员调整',
      content: `知识《${knowledge.title}》的分类已被管理员调整。`,
    });
    await writeAuditLog({
      actorId: req.currentUser!.id,
      action: AuditAction.UPDATE_KNOWLEDGE_CATEGORY,
      targetId: id,
      summary: `修改知识分类 ${knowledge.title}`,
      metadata: { categoryId },
    });
    sendSuccess(res, { knowledge: toKnowledgeDetail(updatedKnowledge, req.currentUser!.id) });
  }),
);

adminKnowledgeRouter.patch(
  '/:id/tags',
  validate({ params: idParamsSchema, body: tagsBodySchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { tagIds } = req.body as z.infer<typeof tagsBodySchema>;
    const knowledge = await getKnowledgeOrThrow(id);
    const uniqueTagIds = await ensureTagsExist(tagIds);

    const updatedKnowledge = await prisma.$transaction(async (tx) => {
      await tx.knowledgeTag.deleteMany({ where: { knowledgeId: id } });
      return tx.knowledgeItem.update({
        where: { id },
        data: { tags: { create: uniqueTagIds.map((tagId) => ({ tagId })) } },
        include: relationInclude,
      });
    });

    await createNotificationForAuthor({
      knowledgeId: id,
      authorId: knowledge.authorId,
      title: '知识标签已被管理员调整',
      content: `知识《${knowledge.title}》的标签已被管理员调整。`,
    });
    await writeAuditLog({
      actorId: req.currentUser!.id,
      action: AuditAction.UPDATE_KNOWLEDGE_TAGS,
      targetId: id,
      summary: `修改知识标签 ${knowledge.title}`,
      metadata: { tagIds: uniqueTagIds },
    });
    sendSuccess(res, { knowledge: toKnowledgeDetail(updatedKnowledge, req.currentUser!.id) });
  }),
);
