<script setup lang="ts">
import { NButton, NCard, NEmpty, NH1, NInput, NList, NListItem, NPagination, NSpace, NSpin, NTag, NText, useMessage } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { knowledgeApi } from '@/api/knowledge';
import type { KnowledgeSummary } from '@/types/knowledge';

const router = useRouter();
const message = useMessage();
const loading = ref(false);
const items = ref<KnowledgeSummary[]>([]);
const query = reactive({ page: 1, pageSize: 10, keyword: '' });
const total = ref(0);

const loadKnowledge = async () => {
  loading.value = true;
  try {
    const result = await knowledgeApi.list({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
    });
    items.value = result.items;
    total.value = result.total;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '知识列表加载失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = async () => {
  query.page = 1;
  await loadKnowledge();
};

onMounted(loadKnowledge);
</script>

<template>
  <main class="page-stack">
    <section class="page-hero compact">
      <div>
        <NTag type="info" round>知识内容</NTag>
        <NH1>知识库</NH1>
        <NText depth="3">浏览已发布知识，按标题、正文和标签进行简单搜索。</NText>
      </div>
      <NButton type="primary" @click="router.push({ name: 'knowledge-create' })">创建知识</NButton>
    </section>

    <NCard>
      <NSpace vertical size="large">
        <NSpace>
          <NInput v-model:value="query.keyword" clearable placeholder="搜索标题、正文或标签" @keyup.enter="handleSearch" />
          <NButton type="primary" @click="handleSearch">搜索</NButton>
        </NSpace>

        <NSpin :show="loading">
          <NEmpty v-if="items.length === 0" description="暂无知识内容" />
          <NList v-else hoverable clickable>
            <NListItem v-for="item in items" :key="item.id" @click="router.push({ name: 'knowledge-detail', params: { id: item.id } })">
              <NSpace vertical size="small">
                <NSpace align="center">
                  <NText strong>{{ item.title }}</NText>
                  <NTag v-if="item.isPinned" size="small" type="warning">置顶</NTag>
                  <NTag size="small" :type="item.status === 'PUBLISHED' ? 'success' : 'default'">{{ item.status }}</NTag>
                </NSpace>
                <NText depth="3">{{ item.summary }}</NText>
                <NSpace size="small">
                  <NTag size="small">{{ item.category.name }}</NTag>
                  <NTag v-for="tag in item.tags" :key="tag.id" size="small" type="info">{{ tag.name }}</NTag>
                </NSpace>
                <NText depth="3">
                  {{ item.author.displayName }} · 浏览 {{ item.viewCount }} · 更新 {{ new Date(item.updatedAt).toLocaleString() }}
                </NText>
              </NSpace>
            </NListItem>
          </NList>
        </NSpin>

        <NPagination v-model:page="query.page" :page-size="query.pageSize" :item-count="total" @update:page="loadKnowledge" />
      </NSpace>
    </NCard>
  </main>
</template>
