import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const AdminLayout = () => import('@/layouts/AdminLayout.vue');
const MainLayout = () => import('@/layouts/MainLayout.vue');
const AdminAuditLogsPage = () => import('@/pages/AdminAuditLogsPage.vue');
const AdminCommentsPage = () => import('@/pages/AdminCommentsPage.vue');
const AdminDashboardPage = () => import('@/pages/AdminDashboardPage.vue');
const AdminKnowledgePage = () => import('@/pages/AdminKnowledgePage.vue');
const AdminTaxonomyPage = () => import('@/pages/AdminTaxonomyPage.vue');
const AdminUsersPage = () => import('@/pages/AdminUsersPage.vue');
const HomePage = () => import('@/pages/HomePage.vue');
const KnowledgeDetailPage = () => import('@/pages/KnowledgeDetailPage.vue');
const KnowledgeEditorPage = () => import('@/pages/KnowledgeEditorPage.vue');
const KnowledgeListPage = () => import('@/pages/KnowledgeListPage.vue');
const LoginPage = () => import('@/pages/LoginPage.vue');
const MyFavoritesPage = () => import('@/pages/MyFavoritesPage.vue');
const NotificationsPage = () => import('@/pages/NotificationsPage.vue');
const UnauthorizedPage = () => import('@/pages/UnauthorizedPage.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { guestOnly: true },
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: HomePage,
          meta: { requiresAuth: true },
        },
        {
          path: 'knowledge',
          name: 'knowledge-list',
          component: KnowledgeListPage,
          meta: { requiresAuth: true },
        },
        {
          path: 'knowledge/create',
          name: 'knowledge-create',
          component: KnowledgeEditorPage,
          meta: { requiresAuth: true },
        },
        {
          path: 'me/favorites',
          name: 'my-favorites',
          component: MyFavoritesPage,
          meta: { requiresAuth: true },
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: NotificationsPage,
          meta: { requiresAuth: true },
        },
        {
          path: 'knowledge/:id',
          name: 'knowledge-detail',
          component: KnowledgeDetailPage,
          meta: { requiresAuth: true },
        },
        {
          path: 'knowledge/:id/edit',
          name: 'knowledge-edit',
          component: KnowledgeEditorPage,
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: AdminDashboardPage,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'users',
          name: 'admin-users',
          component: AdminUsersPage,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'taxonomy',
          name: 'admin-taxonomy',
          component: AdminTaxonomyPage,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'knowledge',
          name: 'admin-knowledge',
          component: AdminKnowledgePage,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'comments',
          name: 'admin-comments',
          component: AdminCommentsPage,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'audit-logs',
          name: 'admin-audit-logs',
          component: AdminAuditLogsPage,
          meta: { requiresAuth: true, requiresAdmin: true },
        },
      ],
    },
    {
      path: '/unauthorized',
      name: 'unauthorized',
      component: UnauthorizedPage,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (authStore.token && !authStore.currentUser) {
    try {
      await authStore.fetchMe();
    } catch {
      if (to.name !== 'login') {
        return { name: 'login', query: { redirect: to.fullPath } };
      }
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'home' };
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'unauthorized' };
  }

  return true;
});

export default router;
