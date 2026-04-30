<script setup lang="ts">
import { NCard, NDataTable, NH2, NP, NTag } from 'naive-ui';

import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const columns = [
  {
    title: '字段',
    key: 'field',
  },
  {
    title: '当前值',
    key: 'value',
  },
];

const rows = [
  { field: '用户', value: authStore.currentUser?.username ?? '-' },
  { field: '显示名', value: authStore.currentUser?.displayName ?? '-' },
  { field: '角色', value: authStore.currentUser?.role ?? '-' },
];
</script>

<template>
  <section>
    <NCard>
      <NTag type="info" round>Admin</NTag>
      <NH2>用户管理</NH2>
      <NP>当前页面先接入后台权限和布局。后续阶段会在这里补全用户列表、创建用户、禁用启用和重置密码表单。</NP>
      <NDataTable :columns="columns" :data="rows" :pagination="false" />
    </NCard>
  </section>
</template>
