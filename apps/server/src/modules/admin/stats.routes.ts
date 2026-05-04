import { AuditAction, KnowledgeStatus, Prisma, UserRole, UserStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';

export const adminStatsRouter = Router();
export const adminAuditLogsRouter = Router();

const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: z.nativeEnum(AuditAction).optional(),
  actorId: z.string().trim().min(1).optional(),
  targetType: z.string().trim().min(1).max(80).optional(),
  keyword: z.string().trim().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
});

const toAuditLogItem = (log: Prisma.AuditLogGetPayload<{ include: { actor: { select: { id: true; username: true; displayName: true; role: true } } } }>) => ({
  id: log.id,
  action: log.action,
  targetType: log.targetType,
  targetId: log.targetId,
  summary: log.summary,
  metadata: log.metadata,
  createdAt: log.createdAt,
  actor: log.actor,
});

adminStatsRouter.use(requireAuth, requireAdmin);
adminStatsRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const [
      totalKnowledge,
      publishedKnowledge,
      draftKnowledge,
      archivedKnowledge,
      totalUsers,
      activeUsers,
      disabledUsers,
      adminUsers,
      attachmentAggregate,
      knowledgeViews,
      comments,
      categories,
      tags,
      categoryBreakdown,
      tagBreakdown,
    ] = await prisma.$transaction([
      prisma.knowledgeItem.count({ where: { deletedAt: null } }),
      prisma.knowledgeItem.count({ where: { deletedAt: null, status: KnowledgeStatus.PUBLISHED } }),
      prisma.knowledgeItem.count({ where: { deletedAt: null, status: KnowledgeStatus.DRAFT } }),
      prisma.knowledgeItem.count({ where: { deletedAt: null, status: KnowledgeStatus.ARCHIVED } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { deletedAt: null, status: UserStatus.DISABLED } }),
      prisma.user.count({ where: { deletedAt: null, role: UserRole.ADMIN } }),
      prisma.attachment.aggregate({ where: { deletedAt: null }, _count: { _all: true }, _sum: { fileSize: true } }),
      prisma.knowledgeItem.aggregate({ where: { deletedAt: null }, _sum: { viewCount: true } }),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.category.count({ where: { deletedAt: null } }),
      prisma.tag.count({ where: { deletedAt: null } }),
      prisma.category.findMany({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { _count: { select: { items: { where: { deletedAt: null } } } } },
        take: 12,
      }),
      prisma.tag.findMany({
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'asc' }],
        include: { _count: { select: { items: { where: { knowledge: { deletedAt: null } } } } } },
        take: 12,
      }),
    ]);

    sendSuccess(res, {
      overview: {
        knowledge: {
          total: totalKnowledge,
          published: publishedKnowledge,
          draft: draftKnowledge,
          archived: archivedKnowledge,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          disabled: disabledUsers,
          admins: adminUsers,
        },
        categoryBreakdown: categoryBreakdown.map((category) => ({
          id: category.id,
          name: category.name,
          knowledgeCount: category._count.items,
        })),
        tagBreakdown: tagBreakdown.map((tag) => ({
          id: tag.id,
          name: tag.name,
          knowledgeCount: tag._count.items,
        })),
        totalViews: knowledgeViews._sum.viewCount ?? 0,
        attachments: {
          total: attachmentAggregate._count._all,
          totalSize: attachmentAggregate._sum.fileSize ?? 0,
        },
        comments,
        categories,
        tags,
      },
    });
  }),
);

adminAuditLogsRouter.use(requireAuth, requireAdmin);
adminAuditLogsRouter.get(
  '/',
  validate({ query: auditLogsQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, action, actorId, targetType, keyword, createdFrom, createdTo } = req.query as unknown as z.infer<typeof auditLogsQuerySchema>;
    const createdAt: Prisma.DateTimeFilter | undefined =
      createdFrom || createdTo
        ? {
            ...(createdFrom ? { gte: createdFrom } : {}),
            ...(createdTo ? { lte: createdTo } : {}),
          }
        : undefined;
    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(actorId ? { actorId } : {}),
      ...(targetType ? { targetType } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(keyword
        ? {
            OR: [
              { summary: { contains: keyword, mode: 'insensitive' } },
              { targetType: { contains: keyword, mode: 'insensitive' } },
              { actor: { username: { contains: keyword, mode: 'insensitive' } } },
              { actor: { displayName: { contains: keyword, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, username: true, displayName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    sendSuccess(res, {
      items: items.map(toAuditLogItem),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  }),
);
