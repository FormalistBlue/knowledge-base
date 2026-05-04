<script setup lang="ts">
import {
  NButton,
  NCard,
  NH1,
  NList,
  NListItem,
  NPopconfirm,
  NInput,
  NSpace,
  NSpin,
  NTag,
  NText,
  NThing,
  useMessage,
} from 'naive-ui';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { commentsApi } from '@/api/interactions';
import { knowledgeApi } from '@/api/knowledge';
import { useAuthStore } from '@/stores/auth';
import type { CommentItem } from '@/types/interactions';
import type { KnowledgeDetail } from '@/types/knowledge';
import { downloadFile, previewFile } from '@/utils/file-actions';
import { getFileDescription } from '@/utils/file-display';
import { getKnowledgeStatusLabel, getKnowledgeStatusTagType } from '@/utils/knowledge-status';
import { renderMarkdown } from '@/utils/markdown';
import { loadProtectedImageUrls, replaceProtectedImageUrls, revokeProtectedImageUrls } from '@/utils/markdown-images';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const loading = ref(false);
const knowledge = ref<KnowledgeDetail | null>(null);
const comments = ref<CommentItem[]>([]);
const commentContent = ref('');
const replyInputs = ref<Record<string, string>>({});
const replyVisible = reactive<Record<string, boolean>>({});
const markdownImageUrls = ref<Record<string, string>>({});

const knowledgeId = computed(() => String(route.params.id));
const canManage = computed(() => {
  if (!knowledge.value || !authStore.currentUser) return false;
  return authStore.isAdmin || knowledge.value.author.id === authStore.currentUser.id;
});
const attachmentFiles = computed(() => knowledge.value?.attachments.filter((file) => file.usageType === 'ATTACHMENT') ?? []);
const isDraft = computed(() => knowledge.value?.status === 'DRAFT');
const renderedKnowledgeContent = computed(() => {
  if (!knowledge.value) return '';
  return renderMarkdown(replaceProtectedImageUrls(knowledge.value.content, markdownImageUrls.value));
});

const loadDetail = async () => {
  loading.value = true;
  try {
    revokeProtectedImageUrls(markdownImageUrls.value);
    markdownImageUrls.value = {};
    knowledge.value = null;
    comments.value = [];
    Object.keys(replyVisible).forEach((id) => {
      delete replyVisible[id];
    });
    const nextKnowledge = await knowledgeApi.detail(knowledgeId.value);
    const nextCommentsPromise = nextKnowledge.status === 'DRAFT' ? Promise.resolve([]) : commentsApi.list(knowledgeId.value);
    const [nextComments, nextImageUrls] = await Promise.all([nextCommentsPromise, loadProtectedImageUrls(nextKnowledge.attachments)]);
    knowledge.value = nextKnowledge;
    comments.value = nextComments;
    markdownImageUrls.value = nextImageUrls;
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

const toggleLike = async () => {
  if (!knowledge.value) return;
  knowledge.value = knowledge.value.likedByMe ? await knowledgeApi.unlike(knowledge.value.id) : await knowledgeApi.like(knowledge.value.id);
};

const toggleFavorite = async () => {
  if (!knowledge.value) return;
  knowledge.value = knowledge.value.favoritedByMe ? await knowledgeApi.unfavorite(knowledge.value.id) : await knowledgeApi.favorite(knowledge.value.id);
  message.success(knowledge.value.favoritedByMe ? '已收藏' : '已取消收藏');
};

const submitComment = async () => {
  if (!commentContent.value.trim()) return;
  await commentsApi.create(knowledgeId.value, { content: commentContent.value });
  commentContent.value = '';
  message.success('评论已发布');
  comments.value = await commentsApi.list(knowledgeId.value);
};

const submitReply = async (comment: CommentItem) => {
  const content = replyInputs.value[comment.id]?.trim();
  if (!content) return;
  await commentsApi.create(knowledgeId.value, { content, parentId: comment.id });
  replyInputs.value[comment.id] = '';
  replyVisible[comment.id] = false;
  message.success('回复已发布');
  comments.value = await commentsApi.list(knowledgeId.value);
};

const toggleReply = (comment: CommentItem) => {
  replyVisible[comment.id] = !replyVisible[comment.id];
};

const cancelReply = (comment: CommentItem) => {
  replyInputs.value[comment.id] = '';
  replyVisible[comment.id] = false;
};

const deleteComment = async (comment: CommentItem) => {
  await commentsApi.delete(comment.id);
  message.success('评论已删除');
  comments.value = await commentsApi.list(knowledgeId.value);
};

const canDeleteComment = (comment: CommentItem) => {
  return authStore.isAdmin || authStore.currentUser?.id === comment.user.id || authStore.currentUser?.id === knowledge.value?.author.id;
};

onMounted(loadDetail);
onBeforeUnmount(() => {
  revokeProtectedImageUrls(markdownImageUrls.value);
});
</script>

<template>
  <NSpin :show="loading">
    <main v-if="knowledge" class="page-stack">
      <section class="page-hero compact">
        <div>
          <NTag :type="getKnowledgeStatusTagType(knowledge.status)" round>{{ getKnowledgeStatusLabel(knowledge.status) }}</NTag>
          <NH1>{{ knowledge.title }}</NH1>
          <NText depth="3">{{ knowledge.summary }}</NText>
        </div>
        <NSpace>
          <template v-if="!isDraft">
            <NButton :type="knowledge.likedByMe ? 'primary' : 'default'" secondary @click="toggleLike">
              {{ knowledge.likedByMe ? '已点赞' : '点赞' }} {{ knowledge.likeCount }}
            </NButton>
            <NButton :type="knowledge.favoritedByMe ? 'warning' : 'default'" secondary @click="toggleFavorite">
              {{ knowledge.favoritedByMe ? '已收藏' : '收藏' }} {{ knowledge.favoriteCount }}
            </NButton>
          </template>
          <template v-if="canManage">
            <NButton :type="isDraft ? 'primary' : 'default'" :size="isDraft ? 'large' : 'medium'" @click="router.push({ name: 'knowledge-edit', params: { id: knowledge.id } })">
              {{ isDraft ? '继续编辑草稿' : '编辑' }}
            </NButton>
            <NPopconfirm v-if="!isDraft" @positive-click="handleArchive">
              <template #trigger>
                <NButton secondary>归档</NButton>
              </template>
              确认归档这篇知识吗？归档后普通列表将不再优先展示。
            </NPopconfirm>
            <NPopconfirm @positive-click="handleDelete">
              <template #trigger>
                <NButton type="error" secondary>删除</NButton>
              </template>
              确认删除这篇知识吗？
            </NPopconfirm>
          </template>
        </NSpace>
      </section>

      <section class="knowledge-detail-grid">
        <NCard class="knowledge-content-card" title="文章内容">
          <article class="markdown-preview" v-html="renderedKnowledgeContent"></article>
        </NCard>

        <NCard class="knowledge-aside-card" title="文章信息">
          <div class="knowledge-info-grid">
            <div class="knowledge-info-item">
              <span>作者</span>
              <strong>{{ knowledge.author.displayName }}</strong>
            </div>
            <div class="knowledge-info-item">
              <span>分类</span>
              <strong>{{ knowledge.category.name }}</strong>
            </div>
            <div class="knowledge-info-item">
              <span>浏览</span>
              <strong>{{ knowledge.viewCount }}</strong>
            </div>
            <div class="knowledge-info-item">
              <span>点赞</span>
              <strong>{{ knowledge.likeCount }}</strong>
            </div>
            <div class="knowledge-info-item">
              <span>收藏</span>
              <strong>{{ knowledge.favoriteCount }}</strong>
            </div>
          </div>
          <div class="knowledge-tags-block">
            <NText depth="3">标签</NText>
            <NSpace class="knowledge-tags" size="small">
              <NTag v-for="tag in knowledge.tags" :key="tag.id" size="small" type="info">{{ tag.name }}</NTag>
            </NSpace>
          </div>
        </NCard>
      </section>

      <NCard v-if="attachmentFiles.length" title="附件下载">
        <NList bordered>
          <NListItem v-for="file in attachmentFiles" :key="file.id">
            <NThing :title="file.originalName" :description="getFileDescription(file)">
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

      <NCard v-if="!isDraft" title="评论区">
        <NSpace vertical size="large">
          <div class="comment-compose">
            <NInput v-model:value="commentContent" type="textarea" placeholder="写下你的评论" class="comment-input" :autosize="{ minRows: 3, maxRows: 6 }" />
            <NButton type="primary" @click="submitComment">发布评论</NButton>
          </div>
          <NList bordered>
            <NListItem v-for="comment in comments" :key="comment.id">
              <NSpace vertical size="small">
                <NText strong>{{ comment.user.displayName }}</NText>
                <article class="markdown-preview comment-content" v-html="renderMarkdown(comment.content)"></article>
                <NSpace align="center">
                  <NText depth="3">{{ new Date(comment.createdAt).toLocaleString() }}</NText>
                  <NButton text type="primary" @click="toggleReply(comment)">{{ replyVisible[comment.id] ? '收起回复' : '回复' }}</NButton>
                  <NPopconfirm v-if="canDeleteComment(comment)" @positive-click="deleteComment(comment)">
                    <template #trigger><NButton text type="error">删除</NButton></template>
                    确认删除这条评论吗？
                  </NPopconfirm>
                </NSpace>
                <NList v-if="comment.replies.length" bordered>
                  <NListItem v-for="reply in comment.replies" :key="reply.id">
                    <NSpace vertical size="small">
                      <NText strong>{{ reply.user.displayName }}</NText>
                      <article class="markdown-preview comment-content" v-html="renderMarkdown(reply.content)"></article>
                      <NSpace align="center">
                        <NText depth="3">{{ new Date(reply.createdAt).toLocaleString() }}</NText>
                        <NPopconfirm v-if="canDeleteComment(reply)" @positive-click="deleteComment(reply)">
                          <template #trigger><NButton text type="error">删除</NButton></template>
                          确认删除这条回复吗？
                        </NPopconfirm>
                      </NSpace>
                    </NSpace>
                  </NListItem>
                </NList>
                <div v-if="replyVisible[comment.id]" class="comment-compose reply-compose">
                  <NInput v-model:value="replyInputs[comment.id]" type="textarea" placeholder="回复这条评论" class="comment-input" :autosize="{ minRows: 2, maxRows: 5 }" />
                  <NSpace>
                    <NButton secondary @click="cancelReply(comment)">取消</NButton>
                    <NButton type="primary" secondary @click="submitReply(comment)">回复</NButton>
                  </NSpace>
                </div>
              </NSpace>
            </NListItem>
          </NList>
        </NSpace>
      </NCard>
    </main>
  </NSpin>
</template>
