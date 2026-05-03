<script setup lang="ts">
import { NButton, NCard, NDataTable, NInput, NPagination, NPopconfirm, NSpace, useMessage, type DataTableColumns } from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';

import { adminCommentsApi, commentsApi } from '@/api/interactions';
import type { AdminCommentItem } from '@/types/interactions';
import { pageSizeOptions } from '@/utils/pagination';

const message = useMessage();
const loading = ref(false);
const items = ref<AdminCommentItem[]>([]);
const total = ref(0);
const query = reactive({ page: 1, pageSize: 10, keyword: '' });

const loadComments = async () => {
  loading.value = true;
  try {
    const result = await adminCommentsApi.list({ page: query.page, pageSize: query.pageSize, keyword: query.keyword || undefined });
    items.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
};

const search = async () => {
  query.page = 1;
  await loadComments();
};

const handlePageChange = async (nextPage: number) => {
  query.page = nextPage;
  await loadComments();
};

const handlePageSizeChange = async (nextPageSize: number) => {
  query.page = 1;
  query.pageSize = nextPageSize;
  await loadComments();
};

const deleteComment = async (row: AdminCommentItem) => {
  await commentsApi.delete(row.id);
  message.success('评论已删除');
  await loadComments();
};

const columns: DataTableColumns<AdminCommentItem> = [
  { title: '文章', key: 'knowledge', render: (row) => row.knowledge.title },
  { title: '评论人', key: 'user', render: (row) => row.user.displayName },
  { title: '内容', key: 'content' },
  { title: '类型', key: 'parentId', render: (row) => (row.parentId ? '回复' : '评论') },
  { title: '时间', key: 'createdAt', render: (row) => new Date(row.createdAt).toLocaleString() },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row) {
      return h(
        NPopconfirm,
        { onPositiveClick: () => deleteComment(row) },
        {
          trigger: () => h(NButton, { size: 'small', type: 'error', secondary: true }, { default: () => '删除' }),
          default: () => `确认删除这条评论吗？来自「${row.knowledge.title}」的评论将被移除。`,
        },
      );
    },
  },
];

onMounted(loadComments);
</script>

<template>
  <section>
    <NSpace vertical size="large">
      <NCard>
        <NSpace align="center" wrap>
          <NInput v-model:value="query.keyword" clearable placeholder="按文章、用户或评论内容搜索" @keyup.enter="search" />
          <NButton type="primary" @click="search">搜索</NButton>
        </NSpace>
      </NCard>
      <NCard title="评论管理">
        <NDataTable :loading="loading" :columns="columns" :data="items" :pagination="false" />
        <NPagination
          class="table-pagination"
          :page="query.page"
          :page-size="query.pageSize"
          :page-sizes="pageSizeOptions"
          :item-count="total"
          show-size-picker
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </NCard>
    </NSpace>
  </section>
</template>
