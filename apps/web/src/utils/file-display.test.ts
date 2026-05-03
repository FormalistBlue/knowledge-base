import { describe, expect, it } from 'vitest';

import { getFileDescription, getFileExtensionLabel } from './file-display';

describe('file display helpers', () => {
  it('uses original file name as extension fallback when API data has no extension', () => {
    expect(getFileExtensionLabel({ originalName: 'intro.pdf', extension: undefined as unknown as string })).toBe('PDF');
  });

  it('keeps attachment descriptions renderable even without an extension', () => {
    const description = getFileDescription({ originalName: 'README', extension: undefined as unknown as string, fileSize: 2048 });

    expect(description).toBe('2.0 KB · UNKNOWN');
  });
});
