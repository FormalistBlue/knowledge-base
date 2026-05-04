import { describe, expect, it } from 'vitest';

import router from './index';

describe('router configuration', () => {
  it('contains protected application routes', () => {
    expect(router.hasRoute('login')).toBe(true);
    expect(router.hasRoute('home')).toBe(true);
    expect(router.hasRoute('knowledge-list')).toBe(true);
    expect(router.hasRoute('knowledge-create')).toBe(true);
    expect(router.hasRoute('knowledge-detail')).toBe(true);
    expect(router.hasRoute('knowledge-edit')).toBe(true);
    expect(router.hasRoute('admin-dashboard')).toBe(true);
    expect(router.hasRoute('admin-users')).toBe(true);
    expect(router.hasRoute('admin-taxonomy')).toBe(true);
    expect(router.hasRoute('admin-knowledge')).toBe(true);
    expect(router.hasRoute('admin-comments')).toBe(true);
    expect(router.hasRoute('admin-audit-logs')).toBe(true);
    expect(router.hasRoute('my-drafts')).toBe(true);
    expect(router.hasRoute('notifications')).toBe(true);
    expect(router.hasRoute('unauthorized')).toBe(true);
  });

  it('marks internal routes as protected', () => {
    const home = router.getRoutes().find((route) => route.name === 'home');
    const knowledgeList = router.getRoutes().find((route) => route.name === 'knowledge-list');
    const adminTaxonomy = router.getRoutes().find((route) => route.name === 'admin-taxonomy');

    expect(home?.meta.requiresAuth).toBe(true);
    expect(knowledgeList?.meta.requiresAuth).toBe(true);
    expect(adminTaxonomy?.meta.requiresAdmin).toBe(true);
  });
});
