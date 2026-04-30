<script setup lang="ts">
import { darkTheme, NConfigProvider, NMessageProvider } from 'naive-ui';
import { computed } from 'vue';

import { useThemeStore } from './stores/theme';

const themeStore = useThemeStore();
const naiveTheme = computed(() => (themeStore.isDark ? darkTheme : null));
</script>

<template>
  <NConfigProvider :theme="naiveTheme">
    <NMessageProvider>
      <RouterView />
    </NMessageProvider>
  </NConfigProvider>
</template>
