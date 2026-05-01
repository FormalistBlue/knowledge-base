import { createRouter, createWebHistory } from 'vue-router';

import AdminLayout from '@/layouts/AdminLayout.vue';
import MainLayout from '@/layouts/MainLayout.vue';
import AdminTaxonomyPage from '@/pages/AdminTaxonomyPage.vue';
import AdminUsersPage from '@/pages/AdminUsersPage.vue';
import HomePage from '@/pages/HomePage.vue';
import LoginPage from '@/pages/LoginPage.vue';
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
        },
        {
          path: 'taxonomy',
          name: 'admin-taxonomy',
          component: AdminTaxonomyPage,
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
