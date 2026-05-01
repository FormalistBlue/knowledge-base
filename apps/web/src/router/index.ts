import { createRouter, createWebHistory } from 'vue-router';

import AdminLayout from '@/layouts/AdminLayout.vue';
import MainLayout from '@/layouts/MainLayout.vue';
import AdminCommentsPage from '@/pages/AdminCommentsPage.vue';
import AdminKnowledgePage from '@/pages/AdminKnowledgePage.vue';
import AdminTaxonomyPage from '@/pages/AdminTaxonomyPage.vue';
import AdminUsersPage from '@/pages/AdminUsersPage.vue';
import HomePage from '@/pages/HomePage.vue';
import KnowledgeDetailPage from '@/pages/KnowledgeDetailPage.vue';
import KnowledgeEditorPage from '@/pages/KnowledgeEditorPage.vue';
import KnowledgeListPage from '@/pages/KnowledgeListPage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import MyFavoritesPage from '@/pages/MyFavoritesPage.vue';
import UnauthorizedPage from '@/pages/UnauthorizedPage.vue';
import { useAuthStore } from '@/stores/auth';

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
          component: () => import('@/pages/NotificationsPage.vue'),
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
          redirect: { name: 'admin-users' },
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
