<script setup lang="ts">
import { NButton, NCard, NEmpty, NH1, NList, NListItem, NPagination, NSpace, NSpin, NTag, NText, useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { notificationsApi } from '@/api/interactions';
import type { NotificationItem } from '@/types/interactions';

const router = useRouter();
const message = useMessage();
const loading = ref(false);
const items = ref<NotificationItem[]>([]);
const page = ref(1);
const pageSize = 10;
const total = ref(0);
const unreadCount = ref(0);

const loadNotifications = async () => {
  loading.value = true;
  try {
    const result = await notificationsApi.list({ page: page.value, pageSize });
    items.value = result.items;
    total.value = result.total;
    unreadCount.value = result.unreadCount;
  } finally {
    loading.value = false;
  }
};

const markRead = async (item: NotificationItem) => {
  await notificationsApi.markRead(item.id);
  await loadNotifications();
};

const markAllRead = async () => {
  await notificationsApi.markAllRead();
  message.success('已全部标记为已读');
  await loadNotifications();
};

const deleteNotification = async (item: NotificationItem) => {
  await notificationsApi.delete(item.id);
  message.success('通知已删除');
  await loadNotifications();
};

const openRelated = async (item: NotificationItem) => {
  if (!item.isRead) await markRead(item);
  if (item.relatedId) await router.push({ name: 'knowledge-detail', params: { id: item.relatedId } });
};

onMounted(loadNotifications);
</script>

<template>
  <main class="page-stack">
    <section class="page-hero compact">
      <div>
        <NTag type="info" round>通知中心</NTag>
        <NH1>我的通知</NH1>
        <NText depth="3">未读 {{ unreadCount }} 条。评论、回复和管理员调整都会在这里提醒。</NText>
      </div>
      <NButton type="primary" secondary @click="markAllRead">全部已读</NButton>
    </section>

    <NCard>
      <NSpin :show="loading">
        <NEmpty v-if="items.length === 0" description="暂无通知" />
        <NList v-else hoverable>
          <NListItem v-for="item in items" :key="item.id">
            <NSpace vertical size="small">
              <NSpace align="center">
                <NTag :type="item.isRead ? 'default' : 'success'" size="small">{{ item.isRead ? '已读' : '未读' }}</NTag>
                <NText strong>{{ item.title }}</NText>
              </NSpace>
              <NText depth="3">{{ item.content }}</NText>
              <NSpace align="center">
                <NText depth="3">{{ new Date(item.createdAt).toLocaleString() }}</NText>
                <NButton v-if="!item.isRead" text @click="markRead(item)">标记已读</NButton>
                <NButton v-if="item.relatedId" text @click="openRelated(item)">查看相关知识</NButton>
                <NButton text type="error" @click="deleteNotification(item)">删除</NButton>
              </NSpace>
            </NSpace>
          </NListItem>
        </NList>
      </NSpin>
      <NPagination v-model:page="page" :page-size="pageSize" :item-count="total" @update:page="loadNotifications" />
    </NCard>
  </main>
</template>
