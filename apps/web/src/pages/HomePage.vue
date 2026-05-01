<script setup lang="ts">
import { NButton, NCard, NEmpty, NGrid, NGi, NH1, NP, NSpace, NSpin, NStatistic, NTag, NText, useMessage } from 'naive-ui';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { knowledgeApi } from '@/api/knowledge';
import { useAuthStore } from '@/stores/auth';
import type { KnowledgeHomeResult, KnowledgeSummary } from '@/types/knowledge';

const router = useRouter();
const authStore = useAuthStore();
const message = useMessage();
const loading = ref(false);
const homeData = ref<KnowledgeHomeResult | null>(null);

const totalCategoryKnowledge = computed(() => homeData.value?.categories.reduce((total, category) => total + category.knowledgeCount, 0) ?? 0);

const openKnowledge = (item: KnowledgeSummary) => {
  router.push({ name: 'knowledge-detail', params: { id: item.id } });
};

const openList = (query: Record<string, string | string[]>) => {
  router.push({ name: 'knowledge-list', query });
};

const loadHome = async () => {
  loading.value = true;
  try {
    homeData.value = await knowledgeApi.home();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '首页内容加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(loadHome);
</script>

<template>
  <main class="home-page page-stack">
    <section class="hero">
      <NTag type="success" round>阶段 10 点赞、收藏、浏览数</NTag>
      <NH1>欢迎回来，{{ authStore.currentUser?.displayName }}</NH1>
      <NP>从置顶、最新、热门、分类、标签和个人收藏入口快速进入部门知识内容。</NP>
      <NSpace>
        <NButton type="primary" @click="router.push({ name: 'knowledge-create' })">创建知识</NButton>
        <NButton @click="router.push({ name: 'knowledge-list' })">高级搜索</NButton>
        <NButton secondary @click="router.push({ name: 'my-favorites' })">我的收藏</NButton>
        <NButton v-if="authStore.isAdmin" secondary @click="router.push({ name: 'admin-users' })">进入后台</NButton>
      </NSpace>
    </section>

    <NSpin :show="loading">
      <NSpace vertical size="large">
        <NGrid :cols="3" :x-gap="16" responsive="screen">
          <NGi>
            <NCard>
              <NStatistic label="登录用户" :value="authStore.currentUser?.username ?? '-'" />
            </NCard>
          </NGi>
          <NGi>
            <NCard>
              <NStatistic label="分类内容数" :value="totalCategoryKnowledge" />
            </NCard>
          </NGi>
          <NGi>
            <NCard>
              <NStatistic label="热门标签" :value="homeData?.tags.length ?? 0" />
            </NCard>
          </NGi>
        </NGrid>

        <NCard>
          <div class="home-section-header">
            <div>
              <NTag type="warning" round>置顶知识</NTag>
              <NP>管理员推荐的重点内容。</NP>
            </div>
            <NButton text type="primary" @click="router.push({ name: 'knowledge-list' })">查看全部</NButton>
          </div>
          <NEmpty v-if="!homeData?.pinned.length" description="暂无置顶知识" />
          <div v-else class="knowledge-card-list">
            <NCard v-for="item in homeData.pinned" :key="item.id" class="knowledge-mini-card" @click="openKnowledge(item)">
              <NSpace vertical size="small">
                <NSpace align="center">
                  <NText strong>{{ item.title }}</NText>
                  <NTag size="small" type="warning">置顶</NTag>
                </NSpace>
                <NText depth="3">{{ item.summary }}</NText>
                <NText depth="3">{{ item.category.name }} · 浏览 {{ item.viewCount }} · 点赞 {{ item.likeCount }} · 收藏 {{ item.favoriteCount }}</NText>
              </NSpace>
            </NCard>
          </div>
        </NCard>

        <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <NGi>
            <NCard>
              <div class="home-section-header">
                <div>
                  <NTag type="info" round>最新知识</NTag>
                  <NP>刚发布的新内容。</NP>
                </div>
              </div>
              <NEmpty v-if="!homeData?.latest.length" description="暂无最新知识" />
              <NSpace v-else vertical>
                <NCard v-for="item in homeData.latest" :key="item.id" size="small" class="knowledge-mini-card" @click="openKnowledge(item)">
                  <NSpace vertical size="small">
                    <NText strong>{{ item.title }}</NText>
                    <NText depth="3">
                      {{ item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : '-' }} · {{ item.category.name }} · 点赞 {{ item.likeCount }}
                    </NText>
                  </NSpace>
                </NCard>
              </NSpace>
            </NCard>
          </NGi>
          <NGi>
            <NCard>
              <div class="home-section-header">
                <div>
                  <NTag type="error" round>热门知识</NTag>
                  <NP>按浏览数排序。</NP>
                </div>
              </div>
              <NEmpty v-if="!homeData?.popular.length" description="暂无热门知识" />
              <NSpace v-else vertical>
                <NCard v-for="item in homeData.popular" :key="item.id" size="small" class="knowledge-mini-card" @click="openKnowledge(item)">
                  <NSpace vertical size="small">
                    <NText strong>{{ item.title }}</NText>
                    <NText depth="3">浏览 {{ item.viewCount }} · 点赞 {{ item.likeCount }} · 收藏 {{ item.favoriteCount }} · {{ item.category.name }}</NText>
                  </NSpace>
                </NCard>
              </NSpace>
            </NCard>
          </NGi>
        </NGrid>

        <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <NGi>
            <NCard title="分类入口">
              <NEmpty v-if="!homeData?.categories.length" description="暂无分类" />
              <NSpace v-else>
                <NTag
                  v-for="category in homeData.categories"
                  :key="category.id"
                  round
                  checkable
                  @click="openList({ categoryId: category.id, includeChildren: 'true' })"
                >
                  {{ category.name }} · {{ category.knowledgeCount }}
                </NTag>
              </NSpace>
            </NCard>
          </NGi>
          <NGi>
            <NCard title="热门标签">
              <NEmpty v-if="!homeData?.tags.length" description="暂无标签" />
              <NSpace v-else>
                <NTag v-for="tag in homeData.tags" :key="tag.id" round type="info" checkable @click="openList({ tagIds: tag.id })">
                  {{ tag.name }} · {{ tag.knowledgeCount }}
                </NTag>
              </NSpace>
            </NCard>
          </NGi>
        </NGrid>
      </NSpace>
    </NSpin>
  </main>
</template>
