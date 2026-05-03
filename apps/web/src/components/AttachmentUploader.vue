<script setup lang="ts">
import { NButton, NCard, NEmpty, NList, NListItem, NPopconfirm, NProgress, NSpace, NText, NThing, NUpload, useMessage, type UploadCustomRequestOptions, type UploadFileInfo } from 'naive-ui';
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
  <NCard embedded class="attachment-uploader">
    <NSpace vertical>
      <NUpload :custom-request="handleUpload" :show-file-list="false" :disabled="uploading">
        <NButton :loading="uploading">上传附件</NButton>
      </NUpload>
      <NText depth="3">支持 PDF、Word、Excel、PPT、TXT、Markdown、ZIP 等文件，单个文件最大 50MB。</NText>
      <NProgress v-if="uploading || uploadPercent" type="line" :percentage="uploadPercent" processing />

      <NList v-if="attachmentFiles.length" bordered>
        <NListItem v-for="file in attachmentFiles" :key="file.id">
          <NThing :title="file.originalName" :description="getFileDescription(file)">
            <template #header-extra>
              <NSpace>
                <NButton v-if="['pdf'].includes(file.extension)" text @click="previewFile(file)">预览</NButton>
                <NButton text @click="downloadFile(file)">下载</NButton>
                <NPopconfirm @positive-click="removeFile(file.id)">
                  <template #trigger>
                    <NButton text type="error">移除</NButton>
                  </template>
                  确认从本文中移除此附件？
                </NPopconfirm>
              </NSpace>
            </template>
          </NThing>
        </NListItem>
      </NList>
      <NEmpty v-else description="暂无附件" size="small" />
    </NSpace>
  </NCard>
</template>
