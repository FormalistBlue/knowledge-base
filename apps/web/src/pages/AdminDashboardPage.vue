<script setup lang="ts">
import { NButton, NCard, NGrid, NGi, NH1, NNumberAnimation, NProgress, NSpace, NSpin, NStatistic, NTag, NText, useMessage } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { adminStatsApi } from '@/api/admin';
import type { AdminStatsOverview } from '@/types/admin';

const message = useMessage();
const router = useRouter();
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

const formatFileSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const publishedRate = computed(() => {
  if (!stats.value?.knowledge.total) return 0;
  return Math.round((stats.value.knowledge.published / stats.value.knowledge.total) * 100);
});

const activeUserRate = computed(() => {
  if (!stats.value?.users.total) return 0;
  return Math.round((stats.value.users.active / stats.value.users.total) * 100);
});

const averageViews = computed(() => {
  if (!stats.value?.knowledge.published) return 0;
  return Math.round(stats.value.totalViews / stats.value.knowledge.published);
});

const contentBacklog = computed(() => (stats.value ? stats.value.knowledge.draft + stats.value.knowledge.archived : 0));
const taxonomyTotal = computed(() => (stats.value ? stats.value.categories + stats.value.tags : 0));

onMounted(loadStats);
</script>

<template>
  <NSpace vertical size="large" class="admin-dashboard">
    <NCard class="admin-dashboard-hero">
      <div class="admin-dashboard-hero__copy">
        <NTag type="success" round>Admin Command Center</NTag>
        <NH1>后台概览</NH1>
        <NText depth="3">用一个视角看清内容产能、用户状态、互动质量和资料规模。</NText>
      </div>
      <NSpace class="admin-dashboard-hero__actions">
        <NButton secondary @click="loadStats">刷新数据</NButton>
        <NButton type="primary" @click="router.push({ name: 'admin-knowledge' })">管理文章</NButton>
      </NSpace>
    </NCard>

    <NSpin :show="loading">
      <div v-if="stats" class="admin-dashboard-grid">
        <NCard class="admin-dashboard-panel admin-dashboard-panel--primary">
          <div class="dashboard-kicker">内容健康度</div>
          <div class="dashboard-spotlight">
            <span>{{ publishedRate }}%</span>
            <small>文章已发布</small>
          </div>
          <NProgress type="line" :percentage="publishedRate" :show-indicator="false" status="success" />
          <div class="dashboard-split-metrics">
            <div><strong>{{ stats.knowledge.published }}</strong><span>已发布</span></div>
            <div><strong>{{ stats.knowledge.draft }}</strong><span>草稿</span></div>
            <div><strong>{{ stats.knowledge.archived }}</strong><span>归档</span></div>
          </div>
        </NCard>

        <NCard class="admin-dashboard-panel admin-dashboard-panel--accent">
          <div class="dashboard-kicker">用户可用性</div>
          <div class="dashboard-spotlight">
            <span>{{ activeUserRate }}%</span>
            <small>账号处于活跃状态</small>
          </div>
          <NProgress type="line" :percentage="activeUserRate" :show-indicator="false" status="info" />
          <div class="dashboard-split-metrics">
            <div><strong>{{ stats.users.active }}</strong><span>活跃</span></div>
            <div><strong>{{ stats.users.disabled }}</strong><span>禁用</span></div>
            <div><strong>{{ stats.users.admins }}</strong><span>管理员</span></div>
          </div>
        </NCard>

        <NGrid class="admin-dashboard-metrics" :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
          <NGi>
            <NCard class="metric-card elevated">
              <NStatistic label="知识总数"><NNumberAnimation :from="0" :to="stats.knowledge.total" /></NStatistic>
              <NText depth="3">待整理 {{ contentBacklog }} 篇</NText>
            </NCard>
          </NGi>
          <NGi>
            <NCard class="metric-card elevated">
              <NStatistic label="总浏览量"><NNumberAnimation :from="0" :to="stats.totalViews" /></NStatistic>
              <NText depth="3">已发布均值 {{ averageViews }} 次</NText>
            </NCard>
          </NGi>
          <NGi>
            <NCard class="metric-card elevated">
              <NStatistic label="评论互动"><NNumberAnimation :from="0" :to="stats.comments" /></NStatistic>
              <NText depth="3">仅统计未删除评论</NText>
            </NCard>
          </NGi>
          <NGi>
            <NCard class="metric-card elevated">
              <NStatistic label="附件资料"><NNumberAnimation :from="0" :to="stats.attachments.total" /></NStatistic>
              <NText depth="3">总大小 {{ formatFileSize(stats.attachments.totalSize) }}</NText>
            </NCard>
          </NGi>
        </NGrid>

        <NCard class="admin-dashboard-panel admin-dashboard-wide">
          <div class="dashboard-section-title">
            <div>
              <strong>运营待办</strong>
              <NText depth="3">这些数字可以帮助你决定下一步先优化哪里。</NText>
            </div>
            <NTag round>分类 {{ stats.categories }} · 标签 {{ stats.tags }}</NTag>
          </div>
          <div class="dashboard-action-list">
            <div class="dashboard-action-card">
              <span>01</span>
              <strong>补齐草稿和归档内容</strong>
              <small>当前有 {{ contentBacklog }} 篇内容没有在前台稳定展示。</small>
            </div>
            <div class="dashboard-action-card">
              <span>02</span>
              <strong>检查禁用用户</strong>
              <small>{{ stats.users.disabled }} 个账号处于禁用状态，适合定期复核。</small>
            </div>
            <div class="dashboard-action-card">
              <span>03</span>
              <strong>维护知识导航</strong>
              <small>共 {{ taxonomyTotal }} 个分类和标签，影响检索和文章组织效率。</small>
            </div>
          </div>
        </NCard>
      </div>
    </NSpin>
  </NSpace>
</template>
