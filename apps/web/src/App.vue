<script setup lang="ts">
import { darkTheme, dateZhCN, NConfigProvider, NMessageProvider, zhCN } from 'naive-ui';
import { computed, onMounted } from 'vue';

import { useThemeStore } from './stores/theme';

const themeStore = useThemeStore();
const naiveTheme = computed(() => (themeStore.isDark ? darkTheme : null));

onMounted(() => {
  themeStore.initTheme();
});
</script>

<template>
  <NConfigProvider class="app-theme-provider" :theme="naiveTheme" :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <RouterView />
    </NMessageProvider>
  </NConfigProvider>
</template>
