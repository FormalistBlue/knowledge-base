<script setup lang="ts">
import { NButton, NCard, NDescriptions, NDescriptionsItem, NH1, NList, NListItem, NPopconfirm, NSpace, NSpin, NTag, NText, NThing, useMessage } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { knowledgeApi } from '@/api/knowledge';
import { useAuthStore } from '@/stores/auth';
import type { KnowledgeDetail } from '@/types/knowledge';
import { downloadFile, previewFile } from '@/utils/file-actions';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const loading = ref(false);
const knowledge = ref<KnowledgeDetail | null>(null);

const knowledgeId = computed(() => String(route.params.id));
const canManage = computed(() => {
  if (!knowledge.value || !authStore.currentUser) return false;
  return authStore.isAdmin || knowledge.value.author.id === authStore.currentUser.id;
});
const attachmentFiles = computed(() => knowledge.value?.attachments.filter((file) => file.usageType === 'ATTACHMENT') ?? []);

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const loadDetail = async () => {
  loading.value = true;
  try {
    knowledge.value = await knowledgeApi.detail(knowledgeId.value);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '知识详情加载失败');
  } finally {
    loading.value = false;
  }
};

const handleDelete = async () => {
  await knowledgeApi.delete(knowledgeId.value);
  message.success('已删除知识');
  await router.push({ name: 'knowledge-list' });
};

const handleArchive = async () => {
  knowledge.value = await knowledgeApi.updateStatus(knowledgeId.value, 'ARCHIVED');
  message.success('已归档知识');
};

onMounted(loadDetail);
</script>

<template>
  <NSpin :show="loading">
    <main v-if="knowledge" class="page-stack">
      <section class="page-hero compact">
        <div>
          <NTag type="success" round>{{ knowledge.status }}</NTag>
          <NH1>{{ knowledge.title }}</NH1>
          <NText depth="3">{{ knowledge.summary }}</NText>
        </div>
        <NSpace v-if="canManage">
          <NButton @click="router.push({ name: 'knowledge-edit', params: { id: knowledge.id } })">编辑</NButton>
          <NButton secondary @click="handleArchive">归档</NButton>
          <NPopconfirm @positive-click="handleDelete">
            <template #trigger>
              <NButton type="error" secondary>删除</NButton>
            </template>
            确认删除这篇知识吗？
          </NPopconfirm>
        </NSpace>
      </section>

      <NCard>
        <NDescriptions bordered :column="3" size="small">
          <NDescriptionsItem label="作者">{{ knowledge.author.displayName }}</NDescriptionsItem>
          <NDescriptionsItem label="分类">{{ knowledge.category.name }}</NDescriptionsItem>
          <NDescriptionsItem label="浏览">{{ knowledge.viewCount }}</NDescriptionsItem>
        </NDescriptions>
        <NSpace class="knowledge-tags" size="small">
          <NTag v-for="tag in knowledge.tags" :key="tag.id" size="small" type="info">{{ tag.name }}</NTag>
        </NSpace>
        <article class="markdown-preview">{{ knowledge.content }}</article>
      </NCard>

      <NCard v-if="attachmentFiles.length" title="附件下载">
        <NList bordered>
          <NListItem v-for="file in attachmentFiles" :key="file.id">
            <NThing :title="file.originalName" :description="`${formatFileSize(file.fileSize)} · ${file.extension.toUpperCase()}`">
              <template #header-extra>
                <NSpace>
                  <NButton v-if="file.extension === 'pdf'" text @click="previewFile(file)">预览</NButton>
                  <NButton text @click="downloadFile(file)">下载</NButton>
                </NSpace>
              </template>
            </NThing>
          </NListItem>
        </NList>
      </NCard>
    </main>
  </NSpin>
</template>
