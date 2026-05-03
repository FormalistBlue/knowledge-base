<script setup lang="ts">
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5';
import {
  NButton,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NSpace,
  useMessage,
} from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const themeStore = useThemeStore();

const isRouteActive = (routeNames: string[]) => routeNames.includes(String(route.name ?? ''));

const isAdminRouteActive = () => String(route.name ?? '').startsWith('admin-');

const navButtonProps = (active: boolean) =>
  ({
    type: active ? 'primary' : 'default',
    secondary: active,
    quaternary: !active,
    round: true,
  }) as const;

const handleLogout = async () => {
  await authStore.logout();
  message.success('已退出登录');
  await router.push({ name: 'login' });
};
</script>

<template>
  <NLayout class="app-shell">
    <NLayoutHeader bordered class="app-header">
      <NSpace align="center" justify="space-between" class="app-topbar">
        <div class="brand" @click="router.push({ name: 'home' })">
          <span class="brand-mark">KB</span>
          <div>
            <div class="brand-title">knowledge-base</div>
            <div class="brand-subtitle">部门内部知识库</div>
          </div>
        </div>
        <NSpace align="center" class="app-nav">
          <NButton v-bind="navButtonProps(isRouteActive(['knowledge-list', 'knowledge-detail', 'knowledge-edit']))" @click="router.push({ name: 'knowledge-list' })">
            知识库
          </NButton>
          <NButton v-bind="navButtonProps(isRouteActive(['my-favorites']))" @click="router.push({ name: 'my-favorites' })">我的收藏</NButton>
          <NButton v-bind="navButtonProps(isRouteActive(['notifications']))" @click="router.push({ name: 'notifications' })">通知</NButton>
          <NButton v-bind="navButtonProps(isRouteActive(['knowledge-create']))" @click="router.push({ name: 'knowledge-create' })">创建知识</NButton>
          <NButton v-if="authStore.isAdmin" v-bind="navButtonProps(isAdminRouteActive())" @click="router.push({ name: 'admin-users' })">
            后台管理
          </NButton>
          <span class="app-user-pill">{{ authStore.currentUser?.displayName }}</span>
          <NButton secondary circle @click="themeStore.toggleTheme">
            <template #icon>
              <NIcon :component="themeStore.isDark ? SunnyOutline : MoonOutline" />
            </template>
          </NButton>
          <NButton quaternary round @click="handleLogout">退出</NButton>
        </NSpace>
      </NSpace>
    </NLayoutHeader>
    <NLayout class="app-main has-header">
      <NLayoutContent class="app-content">
        <div class="app-content-inner">
          <RouterView />
        </div>
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>
