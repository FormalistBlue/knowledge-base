<script setup lang="ts">
import { NButton, NCard, NH1, NP } from 'naive-ui';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <main class="center-page">
    <NCard class="state-card">
      <NH1>没有访问权限</NH1>
      <NP>当前账号没有访问后台管理的权限。</NP>
      <NButton type="primary" @click="router.push({ name: 'home' })">返回首页</NButton>
    </NCard>
  </main>
</template>
