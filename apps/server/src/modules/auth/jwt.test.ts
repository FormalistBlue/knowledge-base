import { UserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { signToken, verifyToken } from './jwt.js';

describe('jwt utilities', () => {
  it('signs and verifies auth tokens with user id, role, and token version', () => {
    const token = signToken({
      sub: 'user-1',
      role: UserRole.ADMIN,
      tokenVersion: 3,
    });

    const payload = verifyToken(token);

    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe(UserRole.ADMIN);
    expect(payload.tokenVersion).toBe(3);
  });

  it('rejects invalid tokens', () => {
    expect(() => verifyToken('invalid-token')).toThrow('登录状态无效或已过期');
  });
});
