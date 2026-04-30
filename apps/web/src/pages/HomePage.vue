<script setup lang="ts">
import { NButton, NCard, NGrid, NGi, NH1, NP, NSpace, NStatistic, NTag } from 'naive-ui';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
</script>

<template>
  <main class="home-page">
    <section class="hero">
      <NTag type="success" round>阶段 5 已接入登录</NTag>
      <NH1>欢迎回来，{{ authStore.currentUser?.displayName }}</NH1>
      <NP>
        这里是部门内部知识库首页。当前已经接入登录、JWT 鉴权、路由守卫和后台入口，下一阶段会开始接入分类和标签。
      </NP>
      <NSpace>
        <NButton type="primary">创建知识</NButton>
        <NButton>浏览知识库</NButton>
        <NButton v-if="authStore.isAdmin" secondary @click="router.push({ name: 'admin-users' })">
          进入后台
        </NButton>
      </NSpace>
    </section>

    <NGrid :cols="3" :x-gap="16" responsive="screen">
      <NGi>
        <NCard>
          <NStatistic label="登录用户" :value="authStore.currentUser?.username ?? '-'" />
        </NCard>
      </NGi>
      <NGi>
        <NCard title="最新知识">等待接入知识列表接口。</NCard>
      </NGi>
      <NGi>
        <NCard title="热门标签">等待接入标签模块。</NCard>
      </NGi>
    </NGrid>
  </main>
</template>
