<script setup lang="ts">
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5';
import {
  NButton,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NSpace,
  NText,
  useMessage,
} from 'naive-ui';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const themeStore = useThemeStore();

const handleLogout = async () => {
  await authStore.logout();
  message.success('已退出登录');
  await router.push({ name: 'login' });
};
</script>

<template>
  <NLayout class="app-shell">
    <NLayoutHeader bordered class="app-header">
      <NSpace align="center" justify="space-between">
        <div class="brand" @click="router.push({ name: 'home' })">
          <span class="brand-mark">KB</span>
          <div>
            <NText strong>knowledge-base</NText>
            <div class="brand-subtitle">部门内部知识库</div>
          </div>
        </div>
        <NSpace align="center">
          <NButton quaternary @click="router.push({ name: 'knowledge-list' })">知识库</NButton>
          <NButton quaternary @click="router.push({ name: 'my-favorites' })">我的收藏</NButton>
          <NButton quaternary @click="router.push({ name: 'notifications' })">通知</NButton>
          <NButton type="primary" secondary @click="router.push({ name: 'knowledge-create' })">创建知识</NButton>
          <NButton v-if="authStore.isAdmin" secondary @click="router.push({ name: 'admin-users' })">
            后台管理
          </NButton>
          <NText depth="3">{{ authStore.currentUser?.displayName }}</NText>
          <NButton secondary circle @click="themeStore.toggleTheme">
            <template #icon>
              <NIcon :component="themeStore.isDark ? SunnyOutline : MoonOutline" />
            </template>
          </NButton>
          <NButton quaternary @click="handleLogout">退出</NButton>
        </NSpace>
      </NSpace>
    </NLayoutHeader>
    <NLayout class="app-main has-header">
      <NLayoutContent class="app-content">
        <RouterView />
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>
