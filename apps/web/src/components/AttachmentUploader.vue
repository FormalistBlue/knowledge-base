<script setup lang="ts">
import { NButton, NPopconfirm, NProgress, NSpace, NText, NUpload, useMessage, type UploadCustomRequestOptions } from 'naive-ui';
import { computed, ref } from 'vue';

import { filesApi } from '@/api/files';
import type { UploadedFile } from '@/types/files';
import { downloadFile, previewFile } from '@/utils/file-actions';
import { getFileDescription } from '@/utils/file-display';

const props = defineProps<{
  files: UploadedFile[];
}>();

const emit = defineEmits<{
  'update:files': [files: UploadedFile[]];
}>();

const message = useMessage();
const uploading = ref(false);
const uploadPercent = ref(0);

const attachmentFiles = computed(() => props.files.filter((file) => file.usageType === 'ATTACHMENT'));

const handleUpload = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  const rawFile = file.file;
  if (!rawFile) {
    onError();
    return;
  }

  uploading.value = true;
  uploadPercent.value = 30;
  try {
    const uploaded = await filesApi.uploadAttachment(rawFile);
    uploadPercent.value = 100;
    emit('update:files', [...props.files, uploaded]);
    message.success(`附件已上传：${uploaded.originalName}`);
    onFinish();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '附件上传失败');
    onError();
  } finally {
    uploading.value = false;
    window.setTimeout(() => {
      uploadPercent.value = 0;
    }, 500);
  }
};

const removeFile = (fileId: string) => {
  emit('update:files', props.files.filter((file) => file.id !== fileId));
};
</script>

<template>
  <div class="attachment-uploader asset-uploader-panel">
    <div class="asset-uploader-head">
      <div>
        <strong>附件资料</strong>
        <NText depth="3">支持 PDF、Word、Excel、PPT、TXT、Markdown、ZIP 等文件，单个文件最大 50MB。</NText>
      </div>
      <NUpload :custom-request="handleUpload" :show-file-list="false" :disabled="uploading">
        <NButton type="primary" secondary :loading="uploading">选择附件</NButton>
      </NUpload>
    </div>
    <NProgress v-if="uploading || uploadPercent" type="line" :percentage="uploadPercent" processing />

    <div v-if="attachmentFiles.length" class="attachment-list">
      <div v-for="file in attachmentFiles" :key="file.id" class="attachment-item">
        <div class="attachment-item__icon">{{ file.extension || 'file' }}</div>
        <div class="attachment-item__body">
          <strong>{{ file.originalName }}</strong>
          <span>{{ getFileDescription(file) }}</span>
        </div>
        <NSpace class="attachment-item__actions" size="small">
          <NButton v-if="file.extension === 'pdf'" secondary size="small" @click="previewFile(file)">预览</NButton>
          <NButton secondary size="small" @click="downloadFile(file)">下载</NButton>
          <NPopconfirm @positive-click="removeFile(file.id)">
            <template #trigger>
              <NButton secondary size="small" type="error">移除</NButton>
            </template>
            确认从本文中移除此附件？
          </NPopconfirm>
        </NSpace>
      </div>
    </div>
    <div v-else class="asset-empty-state">
      <span>还没有附件</span>
      <NText depth="3">可以补充原始文档、表格或压缩包，方便读者继续下载使用。</NText>
    </div>
  </div>
</template>
