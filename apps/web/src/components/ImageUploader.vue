<script setup lang="ts">
import { NButton, NImage, NInput, NPopconfirm, NProgress, NSpace, NText, NUpload, useMessage, type UploadCustomRequestOptions } from 'naive-ui';
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

const appendMarkdownImage = (file: UploadedFile) => {
  const imageMarkdown = `\n![${file.originalName}](${file.url})\n`;
  emit('update:markdown', `${props.markdown}${imageMarkdown}`);
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

const removeImage = (fileId: string) => {
  const url = previewUrls.value[fileId];
  if (url) URL.revokeObjectURL(url);
  const { [fileId]: _removed, ...rest } = previewUrls.value;
  previewUrls.value = rest;
  emit('update:files', props.files.filter((file) => file.id !== fileId));
};

onBeforeUnmount(() => {
  Object.values(previewUrls.value).forEach((url) => URL.revokeObjectURL(url));
});
</script>

<template>
  <NSpace vertical class="image-uploader">
    <NSpace align="center">
      <NUpload accept="image/jpeg,image/png,image/gif,image/webp" :custom-request="handleUpload" :show-file-list="false" :disabled="uploading">
        <NButton :loading="uploading">上传图片并插入正文</NButton>
      </NUpload>
      <NText depth="3">支持 JPG、PNG、GIF、WebP。上传后会自动插入 Markdown 图片语法。</NText>
    </NSpace>
    <NProgress v-if="uploading || uploadPercent" type="line" :percentage="uploadPercent" processing />

    <div v-if="imageFiles.length" class="image-grid">
      <div v-for="file in imageFiles" :key="file.id" class="image-card">
        <NImage :src="previewUrls[file.id]" :alt="file.originalName" object-fit="cover" width="120" height="90" @vue:mounted="ensurePreviewUrl(file)" />
        <NInput :value="`![${file.originalName}](${file.url})`" readonly size="small" />
        <NPopconfirm @positive-click="removeImage(file.id)">
          <template #trigger>
            <NButton text type="error">移除</NButton>
          </template>
          确认从本文中移除此图片？
        </NPopconfirm>
      </div>
    </div>
  </NSpace>
</template>
