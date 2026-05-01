import type { Attachment } from '@prisma/client';

export const toFileResponse = (attachment: Attachment) => ({
  id: attachment.id,
  url: `/api/files/${attachment.id}/preview`,
  downloadUrl: `/api/files/${attachment.id}/download`,
  originalName: attachment.originalName,
  fileSize: attachment.fileSize,
  mimeType: attachment.mimeType,
  usageType: attachment.usageType,
  status: attachment.status,
  extension: attachment.extension,
  createdAt: attachment.createdAt,
  boundAt: attachment.boundAt,
});
