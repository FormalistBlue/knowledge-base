import { filesApi } from '@/api/files';
import type { UploadedFile } from '@/types/files';

const openBlob = (blob: Blob, fileName: string, mode: 'preview' | 'download') => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  if (mode === 'download') {
    link.download = fileName;
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

export const previewFile = async (file: UploadedFile) => {
  const blob = await filesApi.previewBlob(file.id);
  openBlob(blob, file.originalName, 'preview');
};

export const downloadFile = async (file: UploadedFile) => {
  const blob = await filesApi.downloadBlob(file.id);
  openBlob(blob, file.originalName, 'download');
};

export const loadPreviewUrl = async (file: UploadedFile) => {
  const blob = await filesApi.previewBlob(file.id);
  return URL.createObjectURL(blob);
};
