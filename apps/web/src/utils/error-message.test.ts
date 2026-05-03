import { describe, expect, it } from 'vitest';

import { getErrorMessage } from './error-message';

describe('getErrorMessage', () => {
  it('reads normalized API error messages from plain rejected objects', () => {
    expect(getErrorMessage({ code: 'CONFLICT', message: '用户名已存在', details: null }, '创建失败')).toBe('用户名已存在');
  });

  it('falls back when the thrown value has no readable message', () => {
    expect(getErrorMessage({ code: 'CONFLICT' }, '创建失败')).toBe('创建失败');
  });
});
