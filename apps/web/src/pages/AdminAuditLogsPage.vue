<script setup lang="ts">
import { NCard, NDataTable, NInput, NPagination, NSelect, NSpace, NTag, type DataTableColumns, type SelectOption } from 'naive-ui';
import { h, onMounted, reactive, ref, watch } from 'vue';

import { adminAuditApi } from '@/api/admin';
import type { AuditAction, AuditLogItem } from '@/types/admin';
import { pageSizeOptions } from '@/utils/pagination';

const loading = ref(false);
const logs = ref<AuditLogItem[]>([]);
const total = ref(0);
const query = reactive({ page: 1, pageSize: 10, keyword: '', action: null as AuditAction | null });

const actionOptions: SelectOption[] = [
  { label: '创建用户', value: 'CREATE_USER' },
  { label: '禁用用户', value: 'DISABLE_USER' },
  { label: '启用用户', value: 'ENABLE_USER' },
  { label: '重置密码', value: 'RESET_PASSWORD' },
  { label: '删除知识', value: 'DELETE_KNOWLEDGE' },
  { label: '置顶知识', value: 'PIN_KNOWLEDGE' },
  { label: '调整分类', value: 'UPDATE_KNOWLEDGE_CATEGORY' },
  { label: '调整标签', value: 'UPDATE_KNOWLEDGE_TAGS' },
  { label: '删除评论', value: 'DELETE_COMMENT' },
  { label: '删除分类', value: 'DELETE_CATEGORY' },
  { label: '删除标签', value: 'DELETE_TAG' },
];

const actionText: Record<AuditAction, string> = {
  CREATE_USER: '创建用户',
  DISABLE_USER: '禁用用户',
  ENABLE_USER: '启用用户',
  RESET_PASSWORD: '重置密码',
  DELETE_KNOWLEDGE: '删除知识',
  PIN_KNOWLEDGE: '置顶知识',
  UPDATE_KNOWLEDGE_CATEGORY: '调整分类',
  UPDATE_KNOWLEDGE_TAGS: '调整标签',
  DELETE_COMMENT: '删除评论',
  DELETE_CATEGORY: '删除分类',
  DELETE_TAG: '删除标签',
};

const columns: DataTableColumns<AuditLogItem> = [
  { title: '时间', key: 'createdAt', width: 180, render: (row) => new Date(row.createdAt).toLocaleString() },
  { title: '操作人', key: 'actor', width: 160, render: (row) => `${row.actor.displayName} (${row.actor.username})` },
  { title: '动作', key: 'action', width: 130, render: (row) => h(NTag, { size: 'small' }, { default: () => actionText[row.action] ?? row.action }) },
  { title: '目标', key: 'targetType', width: 150, render: (row) => `${row.targetType}${row.targetId ? ` / ${row.targetId.slice(0, 8)}` : ''}` },
  { title: '摘要', key: 'summary' },
];

const loadLogs = async () => {
  loading.value = true;
  try {
    const result = await adminAuditApi.list({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      action: query.action ?? undefined,
    });
    logs.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
};

const handlePageChange = async (nextPage: number) => {
  query.page = nextPage;
  await loadLogs();
};

const handlePageSizeChange = async (nextPageSize: number) => {
  query.page = 1;
  query.pageSize = nextPageSize;
  await loadLogs();
};

watch(() => [query.keyword, query.action], () => {
  query.page = 1;
  void loadLogs();
});

onMounted(loadLogs);
</script>

<template>
  <NCard title="审计日志">
    <NSpace vertical size="large">
      <NSpace>
        <NInput v-model:value="query.keyword" clearable placeholder="搜索摘要、操作人" class="filter-control" />
        <NSelect v-model:value="query.action" clearable :options="actionOptions" class="filter-control" />
      </NSpace>

      <NDataTable :columns="columns" :data="logs" :loading="loading" />
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
    </NSpace>
  </NCard>
</template>

<style scoped>
.filter-control {
  width: 220px;
}
</style>
