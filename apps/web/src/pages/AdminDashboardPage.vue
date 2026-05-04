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

type BreakdownItem = { id: string; name: string; knowledgeCount: number };

const buildChartItems = (items: BreakdownItem[], total: number) => items
  .filter((item) => item.knowledgeCount > 0)
  .map((item, index) => ({
    ...item,
    percentage: total ? Math.round((item.knowledgeCount / total) * 100) : 0,
    color: `var(--chart-${(index % 6) + 1})`,
  }));

const buildConicGradient = (items: Array<BreakdownItem & { percentage: number; color: string }>) => {
  if (items.length === 0) {
    return 'conic-gradient(var(--kb-border) 0 360deg)';
  }

  let cursor = 0;
  const segments = items.map((item) => {
    const start = cursor;
    const end = cursor + item.percentage;
    cursor = end;
    return `${item.color} ${start}% ${end}%`;
  });
  if (cursor < 100) {
    segments.push(`var(--kb-surface-muted) ${cursor}% 100%`);
  }
  return `conic-gradient(${segments.join(', ')})`;
};

const categoryTotal = computed(() => stats.value?.categoryBreakdown.reduce((total, category) => total + category.knowledgeCount, 0) ?? 0);
const categoryChartItems = computed(() => buildChartItems(stats.value?.categoryBreakdown ?? [], categoryTotal.value));
const categoryConicGradient = computed(() => buildConicGradient(categoryChartItems.value));
const tagTotal = computed(() => stats.value?.tagBreakdown.reduce((total, tag) => total + tag.knowledgeCount, 0) ?? 0);
const tagChartItems = computed(() => buildChartItems(stats.value?.tagBreakdown ?? [], tagTotal.value));
const tagConicGradient = computed(() => buildConicGradient(tagChartItems.value));

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
      <NSpace class="admin-dashboard-hero__actions" align="center" justify="end" wrap>
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

        <div class="admin-dashboard-chart-grid admin-dashboard-wide">
          <NCard class="admin-dashboard-panel admin-dashboard-chart-panel">
            <div class="dashboard-section-title">
              <div>
                <strong>分类内容占比</strong>
                <NText depth="3">按分类看知识分布，帮助判断哪些栏目需要补充或拆分。</NText>
              </div>
              <NTag round>{{ categoryTotal }} 篇已归类知识</NTag>
            </div>
            <div class="dashboard-category-chart">
              <div class="category-donut" :style="{ background: categoryConicGradient }">
                <div class="category-donut__center">
                  <strong>{{ categoryChartItems.length }}</strong>
                  <span>个活跃分类</span>
                </div>
              </div>
              <div class="category-chart-list">
                <div v-for="item in categoryChartItems" :key="item.id" class="category-chart-row">
                  <span class="category-chart-row__dot" :style="{ background: item.color }"></span>
                  <strong>{{ item.name }}</strong>
                  <div class="category-chart-row__bar"><span :style="{ width: `${item.percentage}%`, background: item.color }"></span></div>
                  <small>{{ item.knowledgeCount }} 篇 · {{ item.percentage }}%</small>
                </div>
                <NText v-if="categoryChartItems.length === 0" depth="3">还没有可统计的分类内容。</NText>
              </div>
            </div>
          </NCard>

          <NCard class="admin-dashboard-panel admin-dashboard-chart-panel">
            <div class="dashboard-section-title">
              <div>
                <strong>标签内容占比</strong>
                <NText depth="3">按标签看知识主题热度，方便发现高频主题和标签维护重点。</NText>
              </div>
              <NTag round>{{ tagTotal }} 次标签引用</NTag>
            </div>
            <div class="dashboard-category-chart">
              <div class="category-donut" :style="{ background: tagConicGradient }">
                <div class="category-donut__center">
                  <strong>{{ tagChartItems.length }}</strong>
                  <span>个活跃标签</span>
                </div>
              </div>
              <div class="category-chart-list">
                <div v-for="item in tagChartItems" :key="item.id" class="category-chart-row">
                  <span class="category-chart-row__dot" :style="{ background: item.color }"></span>
                  <strong>{{ item.name }}</strong>
                  <div class="category-chart-row__bar"><span :style="{ width: `${item.percentage}%`, background: item.color }"></span></div>
                  <small>{{ item.knowledgeCount }} 次 · {{ item.percentage }}%</small>
                </div>
                <NText v-if="tagChartItems.length === 0" depth="3">还没有可统计的标签引用。</NText>
              </div>
            </div>
          </NCard>
        </div>

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
