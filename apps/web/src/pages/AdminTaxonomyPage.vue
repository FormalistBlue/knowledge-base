<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NGrid,
  NGi,
  NH2,
  NInput,
  NInputNumber,
  NP,
  NSelect,
  NSpace,
  NTag,
  useMessage,
  type DataTableColumns,
  type SelectOption,
} from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';

import { taxonomyApi } from '@/api/taxonomy';
import CategoryTree from '@/components/CategoryTree.vue';
import TagSelect from '@/components/TagSelect.vue';
import type { CategoryNode, TagItem } from '@/types/taxonomy';

const message = useMessage();
const loading = ref(false);
const categories = ref<CategoryNode[]>([]);
const tags = ref<TagItem[]>([]);
const selectedTagIds = ref<string[]>([]);

const categoryForm = reactive({
  name: '',
  parentId: '',
  sortOrder: 0,
});

const tagForm = reactive({
  name: '',
});

const flattenCategories = (items: CategoryNode[], depth = 0): Array<CategoryNode & { depth: number }> => {
  return items.flatMap((item) => [{ ...item, depth }, ...flattenCategories(item.children, depth + 1)]);
};

const flatCategories = computed(() => flattenCategories(categories.value));
const categoryOptions = computed<SelectOption[]>(() => [
  { label: '无父级', value: '' },
  ...flatCategories.value.map((category) => ({
    label: `${'—'.repeat(category.depth)} ${category.name}`,
    value: category.id,
  })),
]);

const categoryColumns: DataTableColumns<CategoryNode & { depth: number }> = [
  {
    title: '分类名称',
    key: 'name',
    render(row) {
      return `${'　'.repeat(row.depth)}${row.name}`;
    },
  },
  { title: '排序', key: 'sortOrder', width: 90 },
  { title: '父级 ID', key: 'parentId', render: (row) => row.parentId ?? '-' },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return hDeleteButton('删除', () => deleteCategory(row.id));
    },
  },
];

const tagColumns: DataTableColumns<TagItem> = [
  { title: '标签', key: 'name' },
  { title: '唯一值', key: 'normalizedName' },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return hDeleteButton('删除', () => deleteTag(row.id));
    },
  },
];

function hDeleteButton(label: string, onClick: () => void) {
  return h(
    NButton,
    { size: 'small', tertiary: true, type: 'error', onClick },
    { default: () => label },
  );
}

const loadTaxonomy = async () => {
  loading.value = true;
  try {
    const [categoryList, tagList] = await Promise.all([taxonomyApi.getCategories(), taxonomyApi.getTags()]);
    categories.value = categoryList;
    tags.value = tagList;
  } finally {
    loading.value = false;
  }
};

const createCategory = async () => {
  if (!categoryForm.name.trim()) {
    message.warning('请输入分类名称');
    return;
  }

  await taxonomyApi.createCategory({
    name: categoryForm.name,
    parentId: categoryForm.parentId || null,
    sortOrder: categoryForm.sortOrder,
  });
  message.success('分类已创建');
  categoryForm.name = '';
  categoryForm.parentId = '';
  categoryForm.sortOrder = 0;
  await loadTaxonomy();
};

const deleteCategory = async (id: string) => {
  await taxonomyApi.deleteCategory(id);
  message.success('分类已删除');
  await loadTaxonomy();
};

const createTag = async () => {
  if (!tagForm.name.trim()) {
    message.warning('请输入标签名称');
    return;
  }

  await taxonomyApi.createTag({ name: tagForm.name });
  message.success('标签已创建');
  tagForm.name = '';
  await loadTaxonomy();
};

const deleteTag = async (id: string) => {
  await taxonomyApi.deleteTag(id);
  message.success('标签已删除');
  selectedTagIds.value = selectedTagIds.value.filter((tagId) => tagId !== id);
  await loadTaxonomy();
};

onMounted(loadTaxonomy);
</script>

<script lang="ts">
import { h } from 'vue';
</script>

<template>
  <section>
    <NSpace vertical size="large">
      <NCard>
        <NTag type="success" round>Taxonomy</NTag>
        <NH2>分类和标签管理</NH2>
        <NP>分类像文件夹，用来放文章；标签像关键词，一篇文章后续可以选多个标签。</NP>
      </NCard>

      <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi>
          <NCard title="分类树">
            <CategoryTree :categories="categories" />
          </NCard>
        </NGi>
        <NGi>
          <NCard title="标签选择组件预览">
            <TagSelect v-model="selectedTagIds" :tags="tags" />
          </NCard>
        </NGi>
      </NGrid>

      <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi>
          <NCard title="创建分类">
            <NForm label-placement="top">
              <NFormItem label="分类名称">
                <NInput v-model:value="categoryForm.name" placeholder="例如：研发规范" />
              </NFormItem>
              <NFormItem label="父级分类">
                <NSelect v-model:value="categoryForm.parentId" :options="categoryOptions" />
              </NFormItem>
              <NFormItem label="排序值">
                <NInputNumber v-model:value="categoryForm.sortOrder" :min="0" :max="9999" />
              </NFormItem>
              <NButton type="primary" :loading="loading" @click="createCategory">创建分类</NButton>
            </NForm>
          </NCard>
        </NGi>

        <NGi>
          <NCard title="创建标签">
            <NForm label-placement="top">
              <NFormItem label="标签名称">
                <NInput v-model:value="tagForm.name" placeholder="例如：Vue" />
              </NFormItem>
              <NButton type="primary" :loading="loading" @click="createTag">创建标签</NButton>
            </NForm>
          </NCard>
        </NGi>
      </NGrid>

      <NCard title="分类列表">
        <NDataTable :loading="loading" :columns="categoryColumns" :data="flatCategories" :pagination="false" />
      </NCard>

      <NCard title="标签列表">
        <NDataTable :loading="loading" :columns="tagColumns" :data="tags" :pagination="false" />
      </NCard>
    </NSpace>
  </section>
</template>
