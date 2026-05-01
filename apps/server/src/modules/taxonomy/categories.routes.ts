import { AuditAction } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';

import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/app-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { buildCategoryTree, toCategoryNode } from './category-presenter.js';

export const categoriesRouter = Router();
export const adminCategoriesRouter = Router();

const categoryBodySchema = z.object({
  name: z.string().trim().min(1).max(50),
  parentId: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const assertParentIsValid = async (categoryId: string | null, parentId: string | null | undefined) => {
  if (!parentId) {
    return;
  }

  if (parentId === categoryId) {
    throw new AppError('VALIDATION_ERROR', '分类不能把自己设为父级', 400);
  }

  const parent = await prisma.category.findFirst({ where: { id: parentId, deletedAt: null } });
  if (!parent) {
    throw new AppError('NOT_FOUND', '父级分类不存在', 404);
  }

  let cursorParentId = parent.parentId;
  while (cursorParentId) {
    if (cursorParentId === categoryId) {
      throw new AppError('VALIDATION_ERROR', '分类父级不能形成循环引用', 400);
    }

    const ancestor = await prisma.category.findFirst({
      where: { id: cursorParentId, deletedAt: null },
      select: { parentId: true },
    });
    cursorParentId = ancestor?.parentId ?? null;
  }
};

categoriesRouter.use(requireAuth);
categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    sendSuccess(res, { categories: buildCategoryTree(categories) });
  }),
);

adminCategoriesRouter.use(requireAuth, requireAdmin);
adminCategoriesRouter.post(
  '/',
  validate({ body: categoryBodySchema }),
  asyncHandler(async (req, res) => {
    const { name, parentId, sortOrder } = req.body as z.infer<typeof categoryBodySchema>;
    const normalizedParentId = parentId ?? null;
    await assertParentIsValid(null, normalizedParentId);

    const existing = await prisma.category.findFirst({
      where: { name, parentId: normalizedParentId, deletedAt: null },
    });
    if (existing) {
      throw new AppError('CONFLICT', '同级分类名称已存在', 409);
    }

    const category = await prisma.category.create({ data: { name, parentId: normalizedParentId, sortOrder } });
    sendSuccess(res, { category: toCategoryNode(category) }, 'created', 201);
  }),
);

adminCategoriesRouter.put(
  '/:id',
  validate({ params: idParamsSchema, body: categoryBodySchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { name, parentId, sortOrder } = req.body as z.infer<typeof categoryBodySchema>;
    const normalizedParentId = parentId ?? null;

    const category = await prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) {
      throw new AppError('NOT_FOUND', '分类不存在', 404);
    }

    await assertParentIsValid(id, normalizedParentId);

    const duplicate = await prisma.category.findFirst({
      where: { id: { not: id }, name, parentId: normalizedParentId, deletedAt: null },
    });
    if (duplicate) {
      throw new AppError('CONFLICT', '同级分类名称已存在', 409);
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name, parentId: normalizedParentId, sortOrder },
    });

    sendSuccess(res, { category: toCategoryNode(updatedCategory) });
  }),
);

adminCategoriesRouter.delete(
  '/:id',
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;

    const category = await prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) {
      throw new AppError('NOT_FOUND', '分类不存在', 404);
    }

    const childCount = await prisma.category.count({ where: { parentId: id, deletedAt: null } });
    if (childCount > 0) {
      throw new AppError('CONFLICT', '分类下存在子分类，不能删除', 409);
    }

    const itemCount = await prisma.knowledgeItem.count({ where: { categoryId: id, deletedAt: null } });
    if (itemCount > 0) {
      throw new AppError('CONFLICT', '分类下存在知识内容，不能删除', 409);
    }

    await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
    await prisma.auditLog.create({
      data: {
        actorId: req.currentUser!.id,
        action: AuditAction.DELETE_CATEGORY,
        targetType: 'Category',
        targetId: id,
        summary: `删除分类 ${category.name}`,
        metadata: { name: category.name },
      },
    });

    sendSuccess(res, { id });
  }),
);
