<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NH1, NInput, NSelect, NSpace, NSpin, NTag, useMessage, type SelectOption } from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { knowledgeApi } from '@/api/knowledge';
import { taxonomyApi } from '@/api/taxonomy';
import { getErrorMessage } from '@/utils/error-message';
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
const categories = ref<CategoryNode[]>([]);
const tags = ref<TagItem[]>([]);
const files = ref<UploadedFile[]>([]);

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
</script>

<template>
  <NSpin :show="loading">
    <main class="page-stack">
      <section class="page-hero compact">
        <div>
          <NTag type="info" round>{{ isEdit ? '编辑知识' : '创建知识' }}</NTag>
          <NH1>{{ isEdit ? '编辑知识' : '创建一篇新知识' }}</NH1>
        </div>
      </section>

      <NCard>
        <NForm label-placement="top">
          <NFormItem label="标题">
            <NInput v-model:value="form.title" placeholder="输入知识标题" />
          </NFormItem>
          <NFormItem label="摘要">
            <NInput v-model:value="form.summary" type="textarea" placeholder="用一两句话说明这篇知识解决什么问题" />
          </NFormItem>
          <NFormItem label="分类">
            <NSelect v-model:value="form.categoryId" filterable placeholder="选择分类" :options="categoryOptions" />
          </NFormItem>
          <NFormItem label="标签">
            <TagSelect v-model="form.tagIds" :tags="tags" />
          </NFormItem>
          <NFormItem label="正文图片">
            <ImageUploader v-model:files="files" v-model:markdown="form.content" />
          </NFormItem>
          <NFormItem label="正文 Markdown">
            <NInput v-model:value="form.content" type="textarea" placeholder="# 标题\n正文内容" :autosize="{ minRows: 14 }" />
          </NFormItem>
          <NFormItem label="附件">
            <AttachmentUploader v-model:files="files" />
          </NFormItem>
          <NSpace>
            <NButton @click="submit('DRAFT')">保存草稿</NButton>
            <NButton type="primary" @click="submit('PUBLISHED')">发布知识</NButton>
          </NSpace>
        </NForm>
      </NCard>
    </main>
  </NSpin>
</template>
