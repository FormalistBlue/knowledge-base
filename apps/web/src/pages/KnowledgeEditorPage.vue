<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NH1, NInput, NModal, NSelect, NSpace, NSpin, NTag, NText, useMessage, type SelectOption } from 'naive-ui';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { knowledgeApi } from '@/api/knowledge';
import { taxonomyApi } from '@/api/taxonomy';
import { getErrorMessage } from '@/utils/error-message';
import { renderMarkdown } from '@/utils/markdown';
import { loadProtectedImageUrls, replaceProtectedImageUrls, revokeProtectedImageUrls } from '@/utils/markdown-images';
import AttachmentUploader from '@/components/AttachmentUploader.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import TagSelect from '@/components/TagSelect.vue';
import type { UploadedFile } from '@/types/files';
import type { KnowledgePayload } from '@/types/knowledge';
import type { CategoryNode, TagItem } from '@/types/taxonomy';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const loading = ref(false);
const previewVisible = ref(false);
const categories = ref<CategoryNode[]>([]);
const tags = ref<TagItem[]>([]);
const files = ref<UploadedFile[]>([]);
const markdownImageUrls = ref<Record<string, string>>({});

const isEdit = computed(() => Boolean(route.params.id));
const knowledgeId = computed(() => String(route.params.id ?? ''));
const form = reactive<KnowledgePayload>({
  title: '',
  summary: '',
  content: '',
  status: 'DRAFT',
  categoryId: '',
  tagIds: [],
  attachmentIds: [],
});

const flattenCategories = (nodes: CategoryNode[], depth = 0): SelectOption[] => {
  return nodes.flatMap((node) => [
    { label: `${'  '.repeat(depth)}${node.name}`, value: node.id },
    ...flattenCategories(node.children, depth + 1),
  ]);
};

const categoryOptions = computed(() => flattenCategories(categories.value));
const selectedCategoryName = computed(() => categoryOptions.value.find((option) => option.value === form.categoryId)?.label?.toString().trim() || '未选择');
const selectedTagNames = computed(() => tags.value.filter((tag) => form.tagIds.includes(tag.id)).map((tag) => tag.name));
const imageCount = computed(() => files.value.filter((file) => file.usageType === 'IMAGE').length);
const attachmentCount = computed(() => files.value.filter((file) => file.usageType === 'ATTACHMENT').length);
const renderedPreview = computed(() => renderMarkdown(replaceProtectedImageUrls(form.content || '', markdownImageUrls.value)));

const refreshMarkdownImageUrls = async () => {
  revokeProtectedImageUrls(markdownImageUrls.value);
  markdownImageUrls.value = await loadProtectedImageUrls(files.value);
};

watch(
  files,
  () => {
    void refreshMarkdownImageUrls().catch(() => {
      message.warning('Markdown 预览图片加载失败，请稍后重试');
    });
  },
  { deep: true },
);

const cancelEdit = async () => {
  if (isEdit.value) {
    await router.push({ name: 'knowledge-detail', params: { id: knowledgeId.value } });
    return;
  }

  await router.push({ name: 'knowledge-list' });
};

const loadOptions = async () => {
  const [categoryList, tagList] = await Promise.all([taxonomyApi.getCategories(), taxonomyApi.getTags()]);
  categories.value = categoryList;
  tags.value = tagList;
};

const loadKnowledge = async () => {
  if (!isEdit.value) return;
  const detail = await knowledgeApi.detail(knowledgeId.value);
  form.title = detail.title;
  form.summary = detail.summary;
  form.content = detail.content;
  form.status = detail.status === 'ARCHIVED' ? 'PUBLISHED' : detail.status;
  form.categoryId = detail.category.id;
  form.tagIds = detail.tags.map((tag) => tag.id);
  files.value = detail.attachments;
};

const init = async () => {
  loading.value = true;
  try {
    await loadOptions();
    await loadKnowledge();
  } catch (error) {
    message.error(getErrorMessage(error, '编辑器初始化失败'));
  } finally {
    loading.value = false;
  }
};

const submit = async (status: KnowledgePayload['status']) => {
  if (!form.categoryId) {
    message.warning('请选择分类');
    return;
  }

  loading.value = true;
  try {
    const payload: KnowledgePayload = { ...form, status, attachmentIds: files.value.map((file) => file.id) };
    const saved = isEdit.value ? await knowledgeApi.update(knowledgeId.value, payload) : await knowledgeApi.create(payload);
    message.success(status === 'PUBLISHED' ? '知识已发布' : '草稿已保存');
    await router.push({ name: 'knowledge-detail', params: { id: saved.id } });
  } catch (error) {
    message.error(getErrorMessage(error, '保存失败'));
  } finally {
    loading.value = false;
  }
};

onMounted(init);
onBeforeUnmount(() => {
  revokeProtectedImageUrls(markdownImageUrls.value);
});
</script>

<template>
  <NSpin :show="loading">
    <main class="page-stack knowledge-editor-page">
      <section class="knowledge-editor-hero">
        <div class="knowledge-editor-hero__copy">
          <NTag type="info" round>{{ isEdit ? '编辑知识' : '创建知识' }}</NTag>
          <NH1>{{ isEdit ? '打磨这篇知识' : '创建一篇新知识' }}</NH1>
          <NText depth="3">把标题、分类、正文和素材组织成一篇可检索、可收藏、可长期维护的知识文档。</NText>
        </div>
        <NSpace class="knowledge-editor-hero__actions" align="center">
          <NButton secondary @click="cancelEdit">取消</NButton>
          <NButton secondary @click="submit('DRAFT')">保存草稿</NButton>
          <NButton type="primary" size="large" @click="submit('PUBLISHED')">发布知识</NButton>
        </NSpace>
      </section>

      <section class="knowledge-editor-grid">
        <NCard class="knowledge-editor-main-card">
          <NForm label-placement="top">
            <div class="editor-section-heading">
              <span>01</span>
              <div>
                <strong>基础信息</strong>
                <small>先让读者知道这篇内容解决什么问题。</small>
              </div>
            </div>
            <div class="knowledge-editor-title-row">
              <NFormItem label="标题">
                <NInput v-model:value="form.title" placeholder="输入知识标题" />
              </NFormItem>
              <NFormItem label="分类">
                <NSelect v-model:value="form.categoryId" filterable placeholder="选择分类" :options="categoryOptions" />
              </NFormItem>
            </div>
            <NFormItem label="摘要">
              <NInput v-model:value="form.summary" type="textarea" placeholder="用一两句话说明这篇知识解决什么问题" :autosize="{ minRows: 3, maxRows: 5 }" />
            </NFormItem>
            <NFormItem label="标签">
              <TagSelect v-model="form.tagIds" :tags="tags" />
            </NFormItem>

            <div class="editor-section-heading">
              <span>02</span>
              <div>
                <strong>正文与素材</strong>
                <small>图片会自动插入 Markdown，预览会显示当前受保护图片。</small>
              </div>
            </div>
            <NFormItem label="正文图片">
              <ImageUploader v-model:files="files" v-model:markdown="form.content" />
            </NFormItem>
            <NFormItem label="正文 Markdown">
              <NSpace vertical size="small" class="editor-markdown-field">
                <NInput v-model:value="form.content" type="textarea" placeholder="# 标题\n正文内容" class="knowledge-editor-textarea" :autosize="{ minRows: 18 }" />
                <NSpace justify="end">
                  <NButton secondary @click="previewVisible = true">预览 Markdown</NButton>
                </NSpace>
              </NSpace>
            </NFormItem>
            <NFormItem label="附件">
              <AttachmentUploader v-model:files="files" />
            </NFormItem>
          </NForm>
        </NCard>

        <aside class="knowledge-editor-aside">
          <NCard class="knowledge-editor-submit-card">
            <NTag round type="success">Ready to publish</NTag>
            <strong>发布前检查</strong>
            <NText depth="3">主操作固定在这里，写完后不用回到页面底部找发布按钮。</NText>
            <div class="editor-checklist">
              <div><span>标题</span><strong>{{ form.title.trim() ? '已填写' : '未填写' }}</strong></div>
              <div><span>分类</span><strong>{{ selectedCategoryName }}</strong></div>
              <div><span>标签</span><strong>{{ selectedTagNames.length || 0 }} 个</strong></div>
              <div><span>图片</span><strong>{{ imageCount }} 张</strong></div>
              <div><span>附件</span><strong>{{ attachmentCount }} 个</strong></div>
            </div>
            <NSpace vertical>
              <NButton type="primary" size="large" block @click="submit('PUBLISHED')">发布知识</NButton>
              <NButton secondary block @click="submit('DRAFT')">保存草稿</NButton>
              <NButton quaternary block @click="previewVisible = true">预览 Markdown</NButton>
            </NSpace>
          </NCard>
        </aside>
      </section>
    </main>

    <NModal v-model:show="previewVisible" preset="card" class="markdown-preview-modal" title="Markdown 预览" size="huge">
      <article v-if="form.content.trim()" class="markdown-preview editor-preview" v-html="renderedPreview"></article>
      <NCard v-else class="editor-preview-empty" embedded>当前还没有可预览的 Markdown 内容。</NCard>
    </NModal>
  </NSpin>
</template>
