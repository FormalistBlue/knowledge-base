import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

describe('password utilities', () => {
  it('hashes passwords without storing plain text and verifies the original password', async () => {
    const password = 'SafePassword123!';

    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
