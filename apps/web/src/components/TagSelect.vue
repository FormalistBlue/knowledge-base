<script setup lang="ts">
import { NSelect } from 'naive-ui';
import { computed } from 'vue';

import type { TagItem } from '@/types/taxonomy';

const model = defineModel<string[]>({ default: [] });
const props = defineProps<{
  tags: TagItem[];
}>();

const options = computed(() => props.tags.map((tag) => ({ label: tag.name, value: tag.id })));
</script>

<template>
  <NSelect v-model:value="model" multiple filterable placeholder="选择标签" :options="options" class="tag-select-control" />
</template>
