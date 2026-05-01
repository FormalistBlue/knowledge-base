<script setup lang="ts">
import {
  NButton,
  NCard,
  NDatePicker,
  NEmpty,
  NH1,
  NInput,
  NList,
  NListItem,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTag,
  NText,
  useMessage,
  type SelectOption,
} from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { knowledgeApi } from '@/api/knowledge';
import { taxonomyApi } from '@/api/taxonomy';
import type { KnowledgeSummary } from '@/types/knowledge';
import type { CategoryNode, TagItem } from '@/types/taxonomy';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const loading = ref(false);
const filterLoading = ref(false);
const items = ref<KnowledgeSummary[]>([]);
const categories = ref<CategoryNode[]>([]);
const tags = ref<TagItem[]>([]);
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  categoryId: null as string | null,
  includeChildren: true,
  tagIds: [] as string[],
  publishedRange: null as [number, number] | null,
  sortBy: 'publishedAt' as 'publishedAt' | 'viewCount' | 'updatedAt',
  sortOrder: 'desc' as 'asc' | 'desc',
});
const total = ref(0);

const flattenCategories = (nodes: CategoryNode[], depth = 0): SelectOption[] =>
  nodes.flatMap((node) => [
    { label: `${'  '.repeat(depth)}${node.name}`, value: node.id },
    ...flattenCategories(node.children, depth + 1),
  ]);

const categoryOptions = computed<SelectOption[]>(() => flattenCategories(categories.value));
const tagOptions = computed<SelectOption[]>(() => tags.value.map((tag) => ({ label: tag.name, value: tag.id })));

const sortOptions: SelectOption[] = [
  { label: '最新发布', value: 'publishedAt:desc' },
  { label: '最近更新', value: 'updatedAt:desc' },
  { label: '浏览最多', value: 'viewCount:desc' },
  { label: '发布时间从早到晚', value: 'publishedAt:asc' },
];

const selectedSort = computed({
  get: () => `${query.sortBy}:${query.sortOrder}`,
  set: (value: string) => {
    const [sortBy, sortOrder] = value.split(':') as ['publishedAt' | 'viewCount' | 'updatedAt', 'asc' | 'desc'];
    query.sortBy = sortBy;
    query.sortOrder = sortOrder;
  },
});

const toDateParam = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

const firstQueryValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const applyRouteQuery = () => {
  const categoryId = firstQueryValue(route.query.categoryId);
  const tagIds = route.query.tagIds;
  const includeChildren = firstQueryValue(route.query.includeChildren);

  query.categoryId = typeof categoryId === 'string' ? categoryId : null;
  query.includeChildren = includeChildren !== 'false';
  query.tagIds = Array.isArray(tagIds) ? tagIds.filter((item): item is string => typeof item === 'string') : typeof tagIds === 'string' ? [tagIds] : [];
};

const loadFilters = async () => {
  filterLoading.value = true;
  try {
    const [categoryResult, tagResult] = await Promise.all([taxonomyApi.getCategories(), taxonomyApi.getTags()]);
    categories.value = categoryResult;
    tags.value = tagResult;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '筛选项加载失败');
  } finally {
    filterLoading.value = false;
  }
};

const loadKnowledge = async () => {
  loading.value = true;
  try {
    const result = await knowledgeApi.list({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      categoryId: query.categoryId || undefined,
      includeChildren: query.categoryId ? query.includeChildren : undefined,
      tagIds: query.tagIds.length > 0 ? query.tagIds : undefined,
      publishedFrom: query.publishedRange ? toDateParam(query.publishedRange[0]) : undefined,
      publishedTo: query.publishedRange ? toDateParam(query.publishedRange[1]) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
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

const resetFilters = async () => {
  query.keyword = '';
  query.categoryId = null;
  query.includeChildren = true;
  query.tagIds = [];
  query.publishedRange = null;
  query.sortBy = 'publishedAt';
  query.sortOrder = 'desc';
  await handleSearch();
};

onMounted(async () => {
  applyRouteQuery();
  await Promise.all([loadFilters(), loadKnowledge()]);
});
</script>

<template>
  <main class="page-stack">
    <section class="page-hero compact">
      <div>
        <NTag type="info" round>搜索筛选</NTag>
        <NH1>知识库</NH1>
        <NText depth="3">按关键词、分类、标签、发布时间和排序快速定位知识内容。</NText>
      </div>
      <NButton type="primary" @click="router.push({ name: 'knowledge-create' })">创建知识</NButton>
    </section>

    <NCard>
      <NSpace vertical size="large">
        <NSpin :show="filterLoading">
          <NSpace vertical size="medium">
            <NSpace align="center" wrap>
              <NInput v-model:value="query.keyword" clearable placeholder="搜索标题、摘要、正文或标签" @keyup.enter="handleSearch" />
              <NSelect v-model:value="query.categoryId" clearable filterable :options="categoryOptions" placeholder="选择分类" class="filter-control" />
              <NSpace align="center" size="small">
                <NText depth="3">包含子分类</NText>
                <NSwitch v-model:value="query.includeChildren" :disabled="!query.categoryId" />
              </NSpace>
            </NSpace>

            <NSpace align="center" wrap>
              <NSelect
                v-model:value="query.tagIds"
                multiple
                clearable
                filterable
                :options="tagOptions"
                placeholder="选择标签"
                class="filter-wide"
              />
              <NDatePicker v-model:value="query.publishedRange" type="daterange" clearable class="filter-control" />
              <NSelect v-model:value="selectedSort" :options="sortOptions" class="filter-control" />
              <NButton type="primary" @click="handleSearch">搜索</NButton>
              <NButton secondary @click="resetFilters">重置</NButton>
            </NSpace>
          </NSpace>
        </NSpin>

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
                  {{ item.author.displayName }} · 浏览 {{ item.viewCount }} · 发布
                  {{ item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : '-' }} · 更新
                  {{ new Date(item.updatedAt).toLocaleString() }}
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
