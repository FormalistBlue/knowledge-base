<script setup lang="ts">
import { NCard, NEmpty, NH1, NList, NListItem, NPagination, NSpace, NSpin, NTag, NText, useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { knowledgeApi } from '@/api/knowledge';
import type { KnowledgeSummary } from '@/types/knowledge';

const router = useRouter();
const message = useMessage();
const loading = ref(false);
const items = ref<KnowledgeSummary[]>([]);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const loadFavorites = async () => {
  loading.value = true;
  try {
    const result = await knowledgeApi.favorites({ page: page.value, pageSize: pageSize.value });
    items.value = result.items;
    total.value = result.total;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '收藏列表加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(loadFavorites);
</script>

<template>
  <main class="page-stack">
    <section class="page-hero compact">
      <div>
        <NTag type="warning" round>我的收藏</NTag>
        <NH1>收藏夹</NH1>
        <NText depth="3">集中查看你收藏过的知识，适合作为个人常用资料入口。</NText>
      </div>
    </section>

    <NCard>
      <NSpin :show="loading">
        <NEmpty v-if="items.length === 0" description="暂无收藏内容" />
        <NList v-else hoverable clickable>
          <NListItem v-for="item in items" :key="item.id" @click="router.push({ name: 'knowledge-detail', params: { id: item.id } })">
            <NSpace vertical size="small">
              <NSpace align="center">
                <NText strong>{{ item.title }}</NText>
                <NTag v-if="item.isPinned" size="small" type="warning">置顶</NTag>
                <NTag size="small" type="success">{{ item.status }}</NTag>
              </NSpace>
              <NText depth="3">{{ item.summary }}</NText>
              <NSpace size="small">
                <NTag size="small">{{ item.category.name }}</NTag>
                <NTag v-for="tag in item.tags" :key="tag.id" size="small" type="info">{{ tag.name }}</NTag>
              </NSpace>
              <NText depth="3">
                {{ item.author.displayName }} · 浏览 {{ item.viewCount }} · 点赞 {{ item.likeCount }} · 收藏 {{ item.favoriteCount }}
              </NText>
            </NSpace>
          </NListItem>
        </NList>
      </NSpin>
      <NPagination v-model:page="page" :page-size="pageSize" :item-count="total" @update:page="loadFavorites" />
    </NCard>
  </main>
</template>
