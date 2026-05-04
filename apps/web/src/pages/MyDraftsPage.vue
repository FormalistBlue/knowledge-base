<script setup lang="ts">
import { NButton, NCard, NEmpty, NH1, NList, NListItem, NPagination, NSpace, NSpin, NTag, NText, useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { knowledgeApi } from '@/api/knowledge';
import type { KnowledgeSummary } from '@/types/knowledge';
import { getKnowledgeStatusLabel, getKnowledgeStatusTagType } from '@/utils/knowledge-status';
import { pageSizeOptions } from '@/utils/pagination';

const router = useRouter();
const message = useMessage();
const loading = ref(false);
const items = ref<KnowledgeSummary[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const loadDrafts = async () => {
  loading.value = true;
  try {
    const result = await knowledgeApi.list({ page: page.value, pageSize: pageSize.value, onlyMine: true, status: 'DRAFT', sortBy: 'updatedAt', sortOrder: 'desc' });
    items.value = result.items;
    total.value = result.total;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '草稿列表加载失败');
  } finally {
    loading.value = false;
  }
};

const handlePageChange = async (nextPage: number) => {
  page.value = nextPage;
  await loadDrafts();
};

const handlePageSizeChange = async (nextPageSize: number) => {
  page.value = 1;
  pageSize.value = nextPageSize;
  await loadDrafts();
};

onMounted(loadDrafts);
</script>

<template>
  <main class="page-stack">
    <section class="page-hero compact drafts-hero">
      <div>
        <NTag type="info" round>我的草稿</NTag>
        <NH1>草稿箱</NH1>
        <NText depth="3">集中找回你还没发布的知识，继续编辑、补充素材，再一键发布。</NText>
      </div>
      <NButton type="primary" size="large" @click="router.push({ name: 'knowledge-create' })">新建草稿</NButton>
    </section>

    <NCard class="drafts-card">
      <NSpin :show="loading">
        <NEmpty v-if="items.length === 0" description="暂无草稿内容">
          <template #extra>
            <NButton type="primary" @click="router.push({ name: 'knowledge-create' })">创建第一篇草稿</NButton>
          </template>
        </NEmpty>
        <NList v-else hoverable clickable class="knowledge-list-results">
          <NListItem v-for="item in items" :key="item.id" @click="router.push({ name: 'knowledge-detail', params: { id: item.id } })">
            <div class="knowledge-list-item draft-list-item">
              <div class="knowledge-list-main">
                <div class="knowledge-list-title-row">
                  <NText strong>{{ item.title }}</NText>
                  <NTag size="small" :type="getKnowledgeStatusTagType(item.status)">{{ getKnowledgeStatusLabel(item.status) }}</NTag>
                </div>
                <NText depth="3" class="knowledge-list-summary">{{ item.summary }}</NText>
                <NSpace size="small" class="knowledge-list-tags">
                  <NTag size="small">{{ item.category.name }}</NTag>
                  <NTag v-for="tag in item.tags" :key="tag.id" size="small" type="info">{{ tag.name }}</NTag>
                </NSpace>
              </div>
              <div class="knowledge-list-meta" aria-label="草稿信息">
                <span>创建 {{ new Date(item.createdAt).toLocaleDateString() }}</span>
                <span>更新 {{ new Date(item.updatedAt).toLocaleDateString() }}</span>
              </div>
              <NButton type="primary" secondary @click.stop="router.push({ name: 'knowledge-edit', params: { id: item.id } })">继续编辑</NButton>
            </div>
          </NListItem>
        </NList>
      </NSpin>
      <NPagination
        class="table-pagination"
        :page="page"
        :page-size="pageSize"
        :page-sizes="pageSizeOptions"
        :item-count="total"
        show-size-picker
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </NCard>
  </main>
</template>
