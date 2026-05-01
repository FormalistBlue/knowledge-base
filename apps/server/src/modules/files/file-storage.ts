import { AttachmentUsageType } from '@prisma/client';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';

export const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
export const attachmentExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'zip', 'rar', '7z']);
export const previewExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']);

const imageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const attachmentMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/octet-stream',
]);

export const getUploadRoot = () => path.resolve(process.env.UPLOAD_DIR || env.UPLOAD_DIR);

export const sanitizeOriginalName = (originalName: string) => path.basename(originalName).replace(/[\r\n]/g, '').trim() || 'unnamed';

export const getExtension = (originalName: string) => path.extname(originalName).replace('.', '').toLowerCase();

export const assertAllowedFile = ({
  usageType,
  extension,
  mimeType,
}: {
  usageType: AttachmentUsageType;
  extension: string;
  mimeType: string;
}) => {
  const allowedExtensions = usageType === AttachmentUsageType.IMAGE ? imageExtensions : attachmentExtensions;
  const allowedMimeTypes = usageType === AttachmentUsageType.IMAGE ? imageMimeTypes : attachmentMimeTypes;

  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(mimeType)) {
    throw new AppError('FILE_TYPE_NOT_ALLOWED', '文件类型不允许', 400);
  }
};

export const buildStoredPath = async (extension: string) => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const storedName = `${crypto.randomUUID()}.${extension}`;
  const relativePath = path.posix.join(year, month, storedName);
  const absoluteDir = path.join(getUploadRoot(), year, month);
  await fs.mkdir(absoluteDir, { recursive: true });
  return {
    storedName,
    relativePath,
    absolutePath: path.join(absoluteDir, storedName),
  };
};

export const resolveAttachmentPath = (relativePath: string) => {
  const root = getUploadRoot();
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(root + path.sep) && absolutePath !== root) {
    throw new AppError('FORBIDDEN', '文件路径不安全', 403);
  }
  return absolutePath;
};
