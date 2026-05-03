import type { UploadedFile } from '@/types/files';
import { loadPreviewUrl } from './file-actions';

const protectedImagePattern = /(!\[[^\]\n]*\]\()((?:https?:\/\/[^\s)]+)?\/api\/files\/([^/)\s]+)\/preview(?:\?[^\s)]*)?)((?:\s+"[^"]*")?\))/g;

export const replaceProtectedImageUrls = (markdown: string, imageUrls: Record<string, string>) => {
  return markdown.replace(protectedImagePattern, (fullMatch, prefix: string, _url: string, fileId: string, suffix: string) => {
    const blobUrl = imageUrls[fileId];
    return blobUrl ? `${prefix}${blobUrl}${suffix}` : fullMatch;
  });
};

export const loadProtectedImageUrls = async (files: UploadedFile[]) => {
  const imageFiles = files.filter((file) => file.usageType === 'IMAGE');
  const entries = await Promise.all(
    imageFiles.map(async (file) => {
      const url = await loadPreviewUrl(file);
      return [file.id, url] as const;
    }),
  );
  return Object.fromEntries(entries);
};

export const revokeProtectedImageUrls = (imageUrls: Record<string, string>) => {
  Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
};
