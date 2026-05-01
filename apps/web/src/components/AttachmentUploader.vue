<script setup lang="ts">
import { NButton, NCard, NEmpty, NList, NListItem, NSpace, NText, NThing, NUpload, useMessage, type UploadCustomRequestOptions, type UploadFileInfo } from 'naive-ui';
import { computed, ref } from 'vue';

import { filesApi } from '@/api/files';
import type { UploadedFile } from '@/types/files';
import { downloadFile, previewFile } from '@/utils/file-actions';

const props = defineProps<{
  files: UploadedFile[];
}>();

const emit = defineEmits<{
  'update:files': [files: UploadedFile[]];
}>();

const message = useMessage();
const uploading = ref(false);

const attachmentFiles = computed(() => props.files.filter((file) => file.usageType === 'ATTACHMENT'));

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const handleUpload = async ({ file, onFinish, onError }: UploadCustomRequestOptions) => {
  const rawFile = file.file;
  if (!rawFile) {
    onError();
    return;
  }

  uploading.value = true;
  try {
    const uploaded = await filesApi.uploadAttachment(rawFile);
    emit('update:files', [...props.files, uploaded]);
    message.success(`附件已上传：${uploaded.originalName}`);
    onFinish();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '附件上传失败');
    onError();
  } finally {
    uploading.value = false;
  }
};

const removeFile = (fileId: string) => {
  emit('update:files', props.files.filter((file) => file.id !== fileId));
};
</script>

<template>
  <NCard embedded class="attachment-uploader">
    <NSpace vertical>
      <NUpload :custom-request="handleUpload" :show-file-list="false" :disabled="uploading">
        <NButton :loading="uploading">上传附件</NButton>
      </NUpload>
      <NText depth="3">支持 PDF、Word、Excel、PPT、TXT、Markdown、ZIP 等文件，单个文件最大 100MB。</NText>

      <NList v-if="attachmentFiles.length" bordered>
        <NListItem v-for="file in attachmentFiles" :key="file.id">
          <NThing :title="file.originalName" :description="`${formatFileSize(file.fileSize)} · ${file.extension.toUpperCase()}`">
            <template #header-extra>
              <NSpace>
                <NButton v-if="['pdf'].includes(file.extension)" text @click="previewFile(file)">预览</NButton>
                <NButton text @click="downloadFile(file)">下载</NButton>
                <NButton text type="error" @click="removeFile(file.id)">移除</NButton>
              </NSpace>
            </template>
          </NThing>
        </NListItem>
      </NList>
      <NEmpty v-else description="暂无附件" size="small" />
    </NSpace>
  </NCard>
</template>
