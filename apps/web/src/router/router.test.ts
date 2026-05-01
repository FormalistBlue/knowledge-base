import { describe, expect, it } from 'vitest';

import router from './index';

describe('router configuration', () => {
  it('contains phase 5 and phase 6 protected routes', () => {
    expect(router.hasRoute('login')).toBe(true);
    expect(router.hasRoute('home')).toBe(true);
    expect(router.hasRoute('admin-users')).toBe(true);
    expect(router.hasRoute('admin-taxonomy')).toBe(true);
    expect(router.hasRoute('unauthorized')).toBe(true);
  });

  it('marks internal routes as protected', () => {
    const home = router.getRoutes().find((route) => route.name === 'home');
    const adminTaxonomy = router.getRoutes().find((route) => route.name === 'admin-taxonomy');

    expect(home?.meta.requiresAuth).toBe(true);
    expect(adminTaxonomy?.meta.requiresAdmin).toBe(true);
  });
});
