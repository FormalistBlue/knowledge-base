import type { UploadedFile } from '@/types/files';

export const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export const getFileExtensionLabel = (file: Pick<UploadedFile, 'extension' | 'originalName'>) => {
  const extension = file.extension?.trim();
  if (extension) return extension.toUpperCase();

  const fileNameExtension = file.originalName.includes('.') ? file.originalName.split('.').pop()?.trim() : '';
  return (fileNameExtension || 'unknown').toUpperCase();
};

export const getFileDescription = (file: Pick<UploadedFile, 'extension' | 'fileSize' | 'originalName'>) => {
  return `${formatFileSize(file.fileSize)} · ${getFileExtensionLabel(file)}`;
};
