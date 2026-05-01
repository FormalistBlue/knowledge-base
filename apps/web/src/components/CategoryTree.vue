<script setup lang="ts">
import { NEmpty, NTree, type TreeOption } from 'naive-ui';
import { computed } from 'vue';

import type { CategoryNode } from '@/types/taxonomy';

const props = defineProps<{
  categories: CategoryNode[];
}>();

const toTreeOptions = (categories: CategoryNode[]): TreeOption[] => {
  return categories.map((category): TreeOption => ({
    key: category.id,
    label: `${category.name} · ${category.sortOrder}`,
    children: category.children.length > 0 ? toTreeOptions(category.children) : undefined,
  }));
};

const treeOptions = computed(() => toTreeOptions(props.categories));
</script>

<template>
  <NEmpty v-if="treeOptions.length === 0" description="暂无分类" />
  <NTree v-else block-line default-expand-all :data="treeOptions" />
</template>
