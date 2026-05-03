import { AttachmentStatus, AttachmentUsageType, KnowledgeStatus, UserRole } from '@prisma/client';
import type { ErrorRequestHandler, Request } from 'express';
import { Router } from 'express';
import fs from 'node:fs/promises';
import multer from 'multer';
import path from 'node:path';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { requireAdmin, requireAuth } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../utils/app-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { prisma } from '../../utils/prisma.js';
import { sendSuccess } from '../../utils/response.js';
import { toFileResponse } from './file-presenter.js';
import { assertAllowedFile, buildStoredPath, getExtension, previewExtensions, resolveAttachmentPath, sanitizeOriginalName } from './file-storage.js';

export const filesRouter = Router();

const idParamsSchema = z.object({ id: z.string().trim().min(1) });
const maxUploadBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxUploadBytes } });

const uploadErrorHandler: ErrorRequestHandler = (error, _req, _res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    next(new AppError('FILE_TOO_LARGE', `文件大小不能超过 ${env.MAX_UPLOAD_SIZE_MB}MB`, 400));
    return;
  }
  next(error);
};

const singleFileUpload = [upload.single('file'), uploadErrorHandler];

const uploadFile = async (req: Request, usageType: AttachmentUsageType) => {
  const currentUser = req.currentUser!;
  const file = req.file;
  if (!file) {
    throw new AppError('VALIDATION_ERROR', '请上传 file 字段', 400);
  }

  const originalName = sanitizeOriginalName(file.originalname);
  const extension = getExtension(originalName);
  assertAllowedFile({ usageType, extension, mimeType: file.mimetype });

  const { storedName, relativePath, absolutePath } = await buildStoredPath(extension);
  await fs.writeFile(absolutePath, file.buffer);

  try {
    const attachment = await prisma.attachment.create({
      data: {
        uploaderId: currentUser.id,
        usageType,
        status: AttachmentStatus.TEMP,
        originalName,
        storedName,
        relativePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        extension,
      },
    });

    return attachment;
  } catch (error) {
    await fs.rm(absolutePath, { force: true });
    throw error;
  }
};

const getAttachmentOrThrow = async (id: string, user: NonNullable<Request['currentUser']>) => {
  const attachment = await prisma.attachment.findFirst({
    where: { id, deletedAt: null },
    include: { knowledge: { select: { id: true, authorId: true, status: true, deletedAt: true } } },
  });
  if (!attachment) {
    throw new AppError('NOT_FOUND', '文件不存在', 404);
  }

  if (attachment.status === AttachmentStatus.TEMP) {
    if (attachment.uploaderId !== user.id) {
      throw new AppError('NOT_FOUND', '文件不存在', 404);
    }
    return attachment;
  }

  const knowledge = attachment.knowledge;
  const canManageKnowledge = knowledge && (user.role === UserRole.ADMIN || knowledge.authorId === user.id);
  const canReadPublished = knowledge?.status === KnowledgeStatus.PUBLISHED;
  if (!knowledge || knowledge.deletedAt || (!canReadPublished && !canManageKnowledge)) {
    throw new AppError('NOT_FOUND', '文件不存在', 404);
  }

  return attachment;
};

filesRouter.use(requireAuth);

filesRouter.post(
  '/images',
  ...singleFileUpload,
  asyncHandler(async (req, res) => {
    const attachment = await uploadFile(req, AttachmentUsageType.IMAGE);
    sendSuccess(res, { file: toFileResponse(attachment) }, 'created', 201);
  }),
);

filesRouter.post(
  '/attachments',
  ...singleFileUpload,
  asyncHandler(async (req, res) => {
    const attachment = await uploadFile(req, AttachmentUsageType.ATTACHMENT);
    sendSuccess(res, { file: toFileResponse(attachment) }, 'created', 201);
  }),
);

filesRouter.get(
  '/:id/preview',
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const attachment = await getAttachmentOrThrow(id, req.currentUser!);
    if (!previewExtensions.has(attachment.extension)) {
      throw new AppError('FILE_TYPE_NOT_ALLOWED', '该文件类型不支持预览，请下载查看', 400);
    }

    const absolutePath = resolveAttachmentPath(attachment.relativePath);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new AppError('NOT_FOUND', '文件不存在', 404);
    }

    res.type(attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
    res.sendFile(absolutePath);
  }),
);

filesRouter.get(
  '/:id/download',
  validate({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const attachment = await getAttachmentOrThrow(id, req.currentUser!);
    const absolutePath = resolveAttachmentPath(attachment.relativePath);
    try {
      await fs.access(absolutePath);
    } catch {
      throw new AppError('NOT_FOUND', '文件不存在', 404);
    }

    res.download(absolutePath, path.basename(attachment.originalName));
  }),
);

filesRouter.post(
  '/cleanup-temp',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const expiredBefore = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredAttachments = await prisma.attachment.findMany({
      where: {
        status: AttachmentStatus.TEMP,
        deletedAt: null,
        createdAt: { lt: expiredBefore },
      },
    });

    let deletedCount = 0;
    for (const attachment of expiredAttachments) {
      await fs.rm(resolveAttachmentPath(attachment.relativePath), { force: true });
      await prisma.attachment.update({ where: { id: attachment.id }, data: { deletedAt: new Date() } });
      deletedCount += 1;
    }

    sendSuccess(res, { deletedCount });
  }),
);
