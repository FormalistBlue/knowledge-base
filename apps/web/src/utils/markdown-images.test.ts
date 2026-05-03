import { describe, expect, it, vi } from 'vitest';

import type { UploadedFile } from '@/types/files';
import { loadProtectedImageUrls, replaceProtectedImageUrls, revokeProtectedImageUrls } from './markdown-images';
import { loadPreviewUrl } from './file-actions';

vi.mock('./file-actions', () => ({
  loadPreviewUrl: vi.fn(),
}));

const mockedLoadPreviewUrl = vi.mocked(loadPreviewUrl);

const imageFile = (id: string): UploadedFile => ({
  id,
  url: `/api/files/${id}/preview`,
  downloadUrl: `/api/files/${id}/download`,
  originalName: `${id}.png`,
  fileSize: 100,
  mimeType: 'image/png',
  usageType: 'IMAGE',
  status: 'BOUND',
  extension: 'png',
  createdAt: new Date().toISOString(),
  boundAt: new Date().toISOString(),
});

describe('markdown image helpers', () => {
  it('replaces protected file image URLs with authenticated blob URLs', () => {
    const markdown = [
      'before',
      '![diagram](/api/files/file-1/preview)',
      '![with-title](/api/files/file-1/preview?size=large "preview title")',
      '![absolute](https://kb.example.com/api/files/file-1/preview)',
      '![external](https://example.com/a.png)',
    ].join('\n');

    const result = replaceProtectedImageUrls(markdown, { 'file-1': 'blob:http://local/file-1' });

    expect(result).toContain('![diagram](blob:http://local/file-1)');
    expect(result).toContain('![with-title](blob:http://local/file-1 "preview title")');
    expect(result).toContain('![absolute](blob:http://local/file-1)');
    expect(result).toContain('![external](https://example.com/a.png)');
  });

  it('loads blob URLs only for uploaded images', async () => {
    mockedLoadPreviewUrl.mockResolvedValueOnce('blob:http://local/file-1');

    const result = await loadProtectedImageUrls([
      imageFile('file-1'),
      { ...imageFile('file-2'), usageType: 'ATTACHMENT' },
    ]);

    expect(result).toEqual({ 'file-1': 'blob:http://local/file-1' });
    expect(mockedLoadPreviewUrl).toHaveBeenCalledTimes(1);
  });

  it('revokes generated blob URLs', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    revokeProtectedImageUrls({ a: 'blob:http://local/a', b: 'blob:http://local/b' });

    expect(revokeSpy).toHaveBeenCalledWith('blob:http://local/a');
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://local/b');
    revokeSpy.mockRestore();
  });
});
