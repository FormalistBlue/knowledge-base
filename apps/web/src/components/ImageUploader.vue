<script setup lang="ts">
import { NButton, NImage, NPopconfirm, NProgress, NText, NUpload, useMessage, type UploadCustomRequestOptions } from 'naive-ui';
import { computed, onBeforeUnmount, ref } from 'vue';

import { filesApi } from '@/api/files';
import type { UploadedFile } from '@/types/files';
import { loadPreviewUrl } from '@/utils/file-actions';

const props = defineProps<{
  files: UploadedFile[];
  markdown: string;
}>();

const emit = defineEmits<{
  'update:files': [files: UploadedFile[]];
  'update:markdown': [markdown: string];
}>();

const message = useMessage();
const uploading = ref(false);
const uploadPercent = ref(0);
const previewUrls = ref<Record<string, string>>({});

const imageFiles = computed(() => props.files.filter((file) => file.usageType === 'IMAGE'));

const createMarkdownImage = (file: UploadedFile) => `![${file.originalName}](${file.url})`;

const appendMarkdownImage = (file: UploadedFile) => {
  const imageMarkdown = createMarkdownImage(file);
  const nextMarkdown = props.markdown.trimEnd() ? `${props.markdown.trimEnd()}\n\n${imageMarkdown}\n` : `${imageMarkdown}\n`;
  emit('update:markdown', nextMarkdown);
};

const getPreviewUrl = async (file: UploadedFile) => {
  if (previewUrls.value[file.id]) return previewUrls.value[file.id];
  const url = await loadPreviewUrl(file);
  previewUrls.value = { ...previewUrls.value, [file.id]: url };
  return url;
};

const ensurePreviewUrl = (file: UploadedFile) => {
  void getPreviewUrl(file).catch(() => {
    message.warning(`图片预览加载失败：${file.originalName}`);
  });
};

const handleUpload = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  const rawFile = file.file;
  if (!rawFile) {
    onError();
    return;
  }

  uploading.value = true;
  uploadPercent.value = 30;
  try {
    const uploaded = await filesApi.uploadImage(rawFile);
    uploadPercent.value = 80;
    await getPreviewUrl(uploaded);
    uploadPercent.value = 100;
    emit('update:files', [...props.files, uploaded]);
    appendMarkdownImage(uploaded);
    message.success(`图片已上传：${uploaded.originalName}`);
    onFinish();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '图片上传失败');
    onError();
  } finally {
    uploading.value = false;
    window.setTimeout(() => {
      uploadPercent.value = 0;
    }, 500);
  }
};

const removeImageMarkdown = (file: UploadedFile) => {
  const escapedUrl = file.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedName = file.originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const markdownPattern = new RegExp(`\\n{0,2}!\\[${escapedName}\\]\\(${escapedUrl}\\)\\n?`, 'g');
  const fallbackPattern = new RegExp(`\\n{0,2}!\\[[^\\]]*\\]\\(${escapedUrl}\\)\\n?`, 'g');
  const nextMarkdown = props.markdown.replace(markdownPattern, '\n').replace(fallbackPattern, '\n').replace(/\n{3,}/g, '\n\n').trimEnd();
  emit('update:markdown', nextMarkdown);
};

const removeImage = (file: UploadedFile) => {
  const url = previewUrls.value[file.id];
  if (url) URL.revokeObjectURL(url);
  const { [file.id]: _removed, ...rest } = previewUrls.value;
  previewUrls.value = rest;
  emit('update:files', props.files.filter((item) => item.id !== file.id));
  removeImageMarkdown(file);
};

onBeforeUnmount(() => {
  Object.values(previewUrls.value).forEach((url) => URL.revokeObjectURL(url));
});
</script>

<template>
  <div class="image-uploader asset-uploader-panel">
    <div class="asset-uploader-head">
      <div>
        <strong>正文图片</strong>
        <NText depth="3">上传后自动插入 Markdown；移除图片会同步删除正文里的图片语法。</NText>
      </div>
      <NUpload accept="image/jpeg,image/png,image/gif,image/webp" :custom-request="handleUpload" :show-file-list="false" :disabled="uploading">
        <NButton type="primary" secondary :loading="uploading">选择图片</NButton>
      </NUpload>
    </div>
    <NProgress v-if="uploading || uploadPercent" type="line" :percentage="uploadPercent" processing />

    <div v-if="imageFiles.length" class="image-grid">
      <div v-for="file in imageFiles" :key="file.id" class="image-card">
        <div class="image-card__preview">
          <NImage :src="previewUrls[file.id]" :alt="file.originalName" object-fit="cover" width="100%" height="150" @vue:mounted="ensurePreviewUrl(file)" />
        </div>
        <div class="image-card__body">
          <strong>{{ file.originalName }}</strong>
          <span>{{ createMarkdownImage(file) }}</span>
        </div>
        <NPopconfirm @positive-click="removeImage(file)">
          <template #trigger>
            <NButton secondary type="error" size="small">移除图片和正文引用</NButton>
          </template>
          确认从本文中移除此图片？正文里的 Markdown 图片语法也会一起删除。
        </NPopconfirm>
      </div>
    </div>
    <div v-else class="asset-empty-state">
      <span>还没有图片</span>
      <NText depth="3">建议上传正文配图、流程截图或示意图，让知识内容更易理解。</NText>
    </div>
  </div>
</template>
