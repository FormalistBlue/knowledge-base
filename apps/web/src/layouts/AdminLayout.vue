<script setup lang="ts">
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5';
import {
  NButton,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  NSpace,
  NText,
  useMessage,
} from 'naive-ui';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const themeStore = useThemeStore();

const activeMenuKey = computed(() => String(route.name ?? 'admin-users'));

const menuOptions = [
  {
    label: '用户管理',
    key: 'admin-users',
  },
  {
    label: '分类标签',
    key: 'admin-taxonomy',
  },
];

const handleMenuUpdate = async (key: string) => {
  await router.push({ name: key });
};

const handleLogout = async () => {
  await authStore.logout();
  message.success('已退出登录');
  await router.push({ name: 'login' });
};
</script>

<template>
  <NLayout class="app-shell" has-sider>
    <NLayoutSider bordered collapse-mode="width" :collapsed-width="72" :width="220" class="admin-sider">
      <div class="admin-brand" @click="router.push({ name: 'home' })">
        <span class="brand-mark">KB</span>
        <div>
          <NText strong>管理后台</NText>
          <div class="brand-subtitle">knowledge-base</div>
        </div>
      </div>
      <NMenu :value="activeMenuKey" :options="menuOptions" @update:value="handleMenuUpdate" />
    </NLayoutSider>

    <NLayout>
      <NLayoutHeader bordered class="app-header">
        <NSpace align="center" justify="space-between">
          <NText strong>后台管理</NText>
          <NSpace align="center">
            <NButton secondary @click="router.push({ name: 'home' })">返回首页</NButton>
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
      <NLayoutContent class="app-content">
        <RouterView />
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>
