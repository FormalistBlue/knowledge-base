<script setup lang="ts">
import { NCard, NGrid, NGi, NH1, NNumberAnimation, NSpace, NSpin, NStatistic, NText, useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';

import { adminStatsApi } from '@/api/admin';
import type { AdminStatsOverview } from '@/types/admin';

const message = useMessage();
const loading = ref(false);
const stats = ref<AdminStatsOverview | null>(null);

const loadStats = async () => {
  loading.value = true;
  try {
    stats.value = await adminStatsApi.overview();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载统计失败');
  } finally {
    loading.value = false;
  }
};

onMounted(loadStats);
</script>

<template>
  <NSpace vertical size="large">
    <div>
      <NH1>后台概览</NH1>
      <NText depth="3">快速了解知识库内容、用户、互动和文件规模。</NText>
    </div>

    <NSpin :show="loading">
      <NGrid v-if="stats" :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi>
          <NCard class="metric-card">
            <NStatistic label="知识总数">
              <NNumberAnimation :from="0" :to="stats.knowledge.total" />
            </NStatistic>
            <NText depth="3">已发布 {{ stats.knowledge.published }} / 草稿 {{ stats.knowledge.draft }} / 归档 {{ stats.knowledge.archived }}</NText>
          </NCard>
        </NGi>
        <NGi>
          <NCard class="metric-card">
            <NStatistic label="用户总数">
              <NNumberAnimation :from="0" :to="stats.users.total" />
            </NStatistic>
            <NText depth="3">活跃 {{ stats.users.active }} / 禁用 {{ stats.users.disabled }} / 管理员 {{ stats.users.admins }}</NText>
          </NCard>
        </NGi>
        <NGi>
          <NCard class="metric-card">
            <NStatistic label="总浏览量">
              <NNumberAnimation :from="0" :to="stats.totalViews" />
            </NStatistic>
            <NText depth="3">来自知识详情访问记录累计。</NText>
          </NCard>
        </NGi>
        <NGi>
          <NCard class="metric-card">
            <NStatistic label="评论数">
              <NNumberAnimation :from="0" :to="stats.comments" />
            </NStatistic>
            <NText depth="3">仅统计未删除评论。</NText>
          </NCard>
        </NGi>
        <NGi>
          <NCard class="metric-card">
            <NStatistic label="附件数">
              <NNumberAnimation :from="0" :to="stats.attachments.total" />
            </NStatistic>
            <NText depth="3">总大小 {{ Math.round(stats.attachments.totalSize / 1024) }} KB</NText>
          </NCard>
        </NGi>
        <NGi>
          <NCard class="metric-card">
            <NStatistic label="分类数">
              <NNumberAnimation :from="0" :to="stats.categories" />
            </NStatistic>
            <NText depth="3">用于组织知识目录。</NText>
          </NCard>
        </NGi>
        <NGi>
          <NCard class="metric-card">
            <NStatistic label="标签数">
              <NNumberAnimation :from="0" :to="stats.tags" />
            </NStatistic>
            <NText depth="3">用于主题和关键词聚合。</NText>
          </NCard>
        </NGi>
      </NGrid>
    </NSpin>
  </NSpace>
</template>

<style scoped>
.metric-card {
  min-height: 142px;
}
</style>
