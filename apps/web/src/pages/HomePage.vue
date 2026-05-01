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
      <NTag type="success" round>阶段 7 知识内容主模块</NTag>
      <NH1>欢迎回来，{{ authStore.currentUser?.displayName }}</NH1>
      <NP>
        这里是部门内部知识库首页。现在已经可以创建知识、保存草稿、发布文章、浏览列表和查看详情。
      </NP>
      <NSpace>
        <NButton type="primary" @click="router.push({ name: 'knowledge-create' })">创建知识</NButton>
        <NButton @click="router.push({ name: 'knowledge-list' })">浏览知识库</NButton>
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
        <NCard title="最新知识">进入知识库页面查看已发布内容。</NCard>
      </NGi>
      <NGi>
        <NCard title="下一步">接入 Vditor、Markdown 渲染和更完整的搜索筛选。</NCard>
      </NGi>
    </NGrid>
  </main>
</template>
