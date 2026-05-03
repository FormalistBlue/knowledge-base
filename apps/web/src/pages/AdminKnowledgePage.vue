<script setup lang="ts">
import { NButton, NCard, NDataTable, NInput, NPagination, NPopconfirm, NSelect, NSpace, NTag, useMessage, type DataTableColumns, type SelectOption } from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';

import { knowledgeApi } from '@/api/knowledge';
import { taxonomyApi } from '@/api/taxonomy';
import type { KnowledgeSummary } from '@/types/knowledge';
import type { CategoryNode, TagItem } from '@/types/taxonomy';
import { getStatusFilterParam, statusOptions, type StatusFilterValue } from './admin-knowledge-filters';

const message = useMessage();
const loading = ref(false);
const items = ref<KnowledgeSummary[]>([]);
const total = ref(0);
const categories = ref<CategoryNode[]>([]);
const tags = ref<TagItem[]>([]);
const selectedCategory = reactive<Record<string, string>>({});
const selectedTags = reactive<Record<string, string[]>>({});
const query = reactive({ page: 1, pageSize: 10, keyword: '', status: 'ALL' as StatusFilterValue });

const flattenCategories = (nodes: CategoryNode[], depth = 0): SelectOption[] =>
  nodes.flatMap((node) => [{ label: `${'  '.repeat(depth)}${node.name}`, value: node.id }, ...flattenCategories(node.children, depth + 1)]);
const categoryOptions = ref<SelectOption[]>([]);
const tagOptions = ref<SelectOption[]>([]);

const loadFilters = async () => {
  const [categoryResult, tagResult] = await Promise.all([taxonomyApi.getCategories(), taxonomyApi.getTags()]);
  categories.value = categoryResult;
  tags.value = tagResult;
  categoryOptions.value = flattenCategories(categoryResult);
  tagOptions.value = tagResult.map((tag) => ({ label: tag.name, value: tag.id }));
};

const loadKnowledge = async () => {
  loading.value = true;
  try {
    const result = await knowledgeApi.adminList({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      status: getStatusFilterParam(query.status),
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    items.value = result.items;
    total.value = result.total;
    for (const item of result.items) {
      selectedCategory[item.id] = item.category.id;
      selectedTags[item.id] = item.tags.map((tag) => tag.id);
    }
  } finally {
    loading.value = false;
  }
};

const search = async () => {
  query.page = 1;
  await loadKnowledge();
};

const updateCategory = async (row: KnowledgeSummary) => {
  await knowledgeApi.updateCategory(row.id, selectedCategory[row.id]);
  message.success('分类已更新');
  await loadKnowledge();
};

const updateTags = async (row: KnowledgeSummary) => {
  await knowledgeApi.updateTags(row.id, selectedTags[row.id] ?? []);
  message.success('标签已更新');
  await loadKnowledge();
};

const togglePin = async (row: KnowledgeSummary) => {
  await knowledgeApi.pin(row.id, !row.isPinned);
  message.success(row.isPinned ? '已取消置顶' : '已置顶');
  await loadKnowledge();
};

const deleteKnowledge = async (row: KnowledgeSummary) => {
  await knowledgeApi.delete(row.id);
  message.success('文章已删除');
  await loadKnowledge();
};

const columns: DataTableColumns<KnowledgeSummary> = [
  { title: '标题', key: 'title', width: 220 },
  { title: '作者', key: 'author', render: (row) => row.author.displayName },
  { title: '状态', key: 'status', render: (row) => h(NTag, { type: row.status === 'PUBLISHED' ? 'success' : 'default', size: 'small' }, { default: () => row.status }) },
  {
    title: '分类',
    key: 'category',
    width: 260,
    render(row) {
      return h(NSpace, { align: 'center' }, () => [
        h(NSelect, { value: selectedCategory[row.id], options: categoryOptions.value, filterable: true, size: 'small', 'onUpdate:value': (value: string) => (selectedCategory[row.id] = value) }),
        h(NButton, { size: 'small', secondary: true, onClick: () => updateCategory(row) }, { default: () => '保存' }),
      ]);
    },
  },
  {
    title: '标签',
    key: 'tags',
    width: 300,
    render(row) {
      return h(NSpace, { align: 'center' }, () => [
        h(NSelect, { value: selectedTags[row.id] ?? [], options: tagOptions.value, multiple: true, filterable: true, size: 'small', 'onUpdate:value': (value: string[]) => (selectedTags[row.id] = value) }),
        h(NButton, { size: 'small', secondary: true, onClick: () => updateTags(row) }, { default: () => '保存' }),
      ]);
    },
  },
  { title: '数据', key: 'stats', render: (row) => `浏览 ${row.viewCount} / 赞 ${row.likeCount} / 收藏 ${row.favoriteCount}` },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row) {
      return h(NSpace, () => [
        h(NButton, { size: 'small', secondary: true, onClick: () => togglePin(row) }, { default: () => (row.isPinned ? '取消置顶' : '置顶') }),
        h(
          NPopconfirm,
          { onPositiveClick: () => deleteKnowledge(row) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => '删除' }),
            default: () => `确认删除文章「${row.title}」？`,
          },
        ),
      ]);
    },
  },
];

onMounted(async () => {
  await loadFilters();
  await loadKnowledge();
});
</script>

<template>
  <section>
    <NSpace vertical size="large">
      <NCard>
        <NSpace align="center" wrap>
          <NInput v-model:value="query.keyword" clearable placeholder="搜索标题、摘要、正文或标签" @keyup.enter="search" />
          <NSelect v-model:value="query.status" clearable :options="statusOptions" class="filter-control" />
          <NButton type="primary" @click="search">搜索</NButton>
        </NSpace>
      </NCard>
      <NCard title="文章管理">
        <NDataTable :loading="loading" :columns="columns" :data="items" :pagination="false" />
        <NPagination v-model:page="query.page" :page-size="query.pageSize" :item-count="total" @update:page="loadKnowledge" />
      </NCard>
    </NSpace>
  </section>
</template>
