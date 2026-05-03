<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NH2,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NP,
  NSelect,
  NSpace,
  NTag,
  NText,
  useMessage,
  type DataTableColumns,
  type SelectOption,
} from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';

import { taxonomyApi } from '@/api/taxonomy';
import CategoryTree from '@/components/CategoryTree.vue';
import TagSelect from '@/components/TagSelect.vue';
import { buildCategoryOptions, flattenCategoryTree, getRootCategories, type FlatCategory } from './admin-taxonomy-utils';
import type { CategoryNode, TagItem } from '@/types/taxonomy';

const message = useMessage();
const loading = ref(false);
const categories = ref<CategoryNode[]>([]);
const tags = ref<TagItem[]>([]);
const selectedTagIds = ref<string[]>([]);
const categoryEditingId = ref<string | null>(null);
const tagEditingId = ref<string | null>(null);
const categoryModalVisible = ref(false);
const tagModalVisible = ref(false);

const categoryForm = reactive({
  name: '',
  parentId: '',
  sortOrder: 0,
});

const tagForm = reactive({
  name: '',
});

const flatCategories = computed(() => flattenCategoryTree(getRootCategories(categories.value)));
const selectedTags = computed(() => tags.value.filter((tag) => selectedTagIds.value.includes(tag.id)));
const categoryOptions = computed<SelectOption[]>(() => buildCategoryOptions(flatCategories.value, categoryEditingId.value));

const categoryColumns: DataTableColumns<FlatCategory> = [
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
    width: 150,
    render(row) {
      return h(NSpace, { align: 'center', size: 'small', wrap: false }, () => [
        h(NButton, { size: 'small', secondary: true, onClick: () => editCategory(row) }, { default: () => '编辑' }),
        hDeleteButton('删除', () => deleteCategory(row.id)),
      ]);
    },
  },
];

const tagColumns: DataTableColumns<TagItem> = [
  { title: '标签', key: 'name' },
  { title: '唯一值', key: 'normalizedName' },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render(row) {
      return h(NSpace, { align: 'center', size: 'small', wrap: false }, () => [
        h(NButton, { size: 'small', secondary: true, onClick: () => editTag(row) }, { default: () => '编辑' }),
        hDeleteButton('删除', () => deleteTag(row.id)),
      ]);
    },
  },
];

function hDeleteButton(label: string, onClick: () => void) {
  return h(
    NPopconfirm,
    { onPositiveClick: onClick },
    {
      trigger: () => h(NButton, { size: 'small', tertiary: true, type: 'error' }, { default: () => label }),
      default: () => `确认${label}吗？`,
    },
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

const saveCategory = async () => {
  if (!categoryForm.name.trim()) {
    message.warning('请输入分类名称');
    return;
  }

  const payload = {
    name: categoryForm.name,
    parentId: categoryForm.parentId || null,
    sortOrder: categoryForm.sortOrder,
  };
  if (categoryEditingId.value) {
    await taxonomyApi.updateCategory(categoryEditingId.value, payload);
    message.success('分类已更新，左侧分类树已同步');
  } else {
    await taxonomyApi.createCategory(payload);
    message.success('分类已创建，左侧分类树已同步');
  }
  categoryModalVisible.value = false;
  resetCategoryForm();
  await loadTaxonomy();
};

const editCategory = (category: FlatCategory) => {
  categoryEditingId.value = category.id;
  categoryForm.name = category.name;
  categoryForm.parentId = category.parentId ?? '';
  categoryForm.sortOrder = category.sortOrder;
  categoryModalVisible.value = true;
};

const deleteCategory = async (id: string) => {
  await taxonomyApi.deleteCategory(id);
  message.success('分类已删除，左侧分类树已同步');
  await loadTaxonomy();
};

const resetCategoryForm = () => {
  categoryEditingId.value = null;
  categoryForm.name = '';
  categoryForm.parentId = '';
  categoryForm.sortOrder = 0;
};

const openCreateCategoryModal = () => {
  resetCategoryForm();
  categoryModalVisible.value = true;
};

const saveTag = async () => {
  if (!tagForm.name.trim()) {
    message.warning('请输入标签名称');
    return;
  }

  if (tagEditingId.value) {
    await taxonomyApi.updateTag(tagEditingId.value, { name: tagForm.name });
    message.success('标签已更新，左侧选择器已同步');
  } else {
    await taxonomyApi.createTag({ name: tagForm.name });
    message.success('标签已创建，左侧选择器已同步');
  }
  tagModalVisible.value = false;
  resetTagForm();
  await loadTaxonomy();
};

const editTag = (tag: TagItem) => {
  tagEditingId.value = tag.id;
  tagForm.name = tag.name;
  tagModalVisible.value = true;
};

const deleteTag = async (id: string) => {
  await taxonomyApi.deleteTag(id);
  message.success('标签已删除，左侧选择器已同步');
  selectedTagIds.value = selectedTagIds.value.filter((tagId) => tagId !== id);
  await loadTaxonomy();
};

const resetTagForm = () => {
  tagEditingId.value = null;
  tagForm.name = '';
};

const openCreateTagModal = () => {
  resetTagForm();
  tagModalVisible.value = true;
};

onMounted(loadTaxonomy);
</script>

<template>
  <section class="taxonomy-page page-stack">
    <NCard class="taxonomy-hero">
      <NTag type="success" round>Taxonomy Workbench</NTag>
      <NH2>分类和标签管理</NH2>
      <NP>左侧是最终在文章编辑、搜索筛选里看到的效果预览；右侧是数据编辑区。新增、编辑或删除后，左侧预览会立即同步。</NP>
      <div class="taxonomy-flow" aria-label="分类标签管理流程">
        <div class="taxonomy-flow__item">
          <span>01</span>
          <strong>先看预览</strong>
          <small>确认文章侧真实呈现</small>
        </div>
        <div class="taxonomy-flow__line" />
        <div class="taxonomy-flow__item">
          <span>02</span>
          <strong>右侧维护数据</strong>
          <small>分类树 / 标签池分别编辑</small>
        </div>
        <div class="taxonomy-flow__line" />
        <div class="taxonomy-flow__item">
          <span>03</span>
          <strong>保存后同步</strong>
          <small>预览和文章编辑同时更新</small>
        </div>
      </div>
    </NCard>

    <div class="taxonomy-workbench">
      <NCard class="taxonomy-preview-card">
        <template #header>
          <div class="taxonomy-card-title">
            <span class="taxonomy-step-dot">预览</span>
            <span>分类树效果</span>
          </div>
        </template>
        <template #header-extra>
          <NTag size="small" round type="success">由右侧分类列表驱动</NTag>
        </template>
        <p class="taxonomy-helper">文章创建和搜索筛选里看到的层级结构，会随着右侧分类编辑区保存后同步变化。</p>
        <div class="taxonomy-preview-box">
          <CategoryTree :categories="categories" />
        </div>
      </NCard>

      <NCard class="taxonomy-editor-card">
        <template #header>
          <div class="taxonomy-card-title">
            <span class="taxonomy-step-dot edit">编辑</span>
            <span>分类编辑区</span>
          </div>
        </template>
        <template #header-extra>
          <NButton type="primary" round @click="openCreateCategoryModal">新增分类</NButton>
        </template>
        <p class="taxonomy-helper">这里维护分类名称、父级和排序。保存成功后，左侧分类树就是最终效果。</p>
        <NDataTable :loading="loading" :columns="categoryColumns" :data="flatCategories" :pagination="false" />
      </NCard>
    </div>

    <div class="taxonomy-workbench">
      <NCard class="taxonomy-preview-card">
        <template #header>
          <div class="taxonomy-card-title">
            <span class="taxonomy-step-dot">预览</span>
            <span>标签选择效果</span>
          </div>
        </template>
        <template #header-extra>
          <NTag size="small" round type="info">由右侧标签列表驱动</NTag>
        </template>
        <p class="taxonomy-helper">文章编辑页会使用这个多选控件。右侧标签增删改后，这里的可选项会同步变化。</p>
        <div class="taxonomy-preview-box">
          <TagSelect v-model="selectedTagIds" :tags="tags" />
          <div class="taxonomy-selection-summary">
            <NText depth="3">已选 {{ selectedTags.length }} 个标签</NText>
            <NSpace v-if="selectedTags.length" size="small">
              <NTag v-for="tag in selectedTags" :key="tag.id" size="small" round type="info">{{ tag.name }}</NTag>
            </NSpace>
          </div>
        </div>
      </NCard>

      <NCard class="taxonomy-editor-card">
        <template #header>
          <div class="taxonomy-card-title">
            <span class="taxonomy-step-dot edit">编辑</span>
            <span>标签编辑区</span>
          </div>
        </template>
        <template #header-extra>
          <NButton type="primary" round @click="openCreateTagModal">新增标签</NButton>
        </template>
        <p class="taxonomy-helper">这里维护标签池。标签唯一值用于避免重复标签，普通用户在文章里只看到标签名称。</p>
        <NDataTable :loading="loading" :columns="tagColumns" :data="tags" :pagination="false" />
      </NCard>
    </div>

    <NModal v-model:show="categoryModalVisible" preset="card" :title="categoryEditingId ? '编辑分类' : '新增分类'" class="admin-dialog" :bordered="false">
      <NForm label-placement="top">
        <NFormItem label="分类名称">
          <NInput v-model:value="categoryForm.name" placeholder="例如：研发规范" />
        </NFormItem>
        <NFormItem label="父级分类">
          <NSelect v-model:value="categoryForm.parentId" :options="categoryOptions" filterable clearable value-field="value" label-field="label" />
        </NFormItem>
        <NFormItem label="排序值">
          <NInputNumber v-model:value="categoryForm.sortOrder" :min="0" :max="9999" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="categoryModalVisible = false">取消</NButton>
          <NButton type="primary" :loading="loading" @click="saveCategory">{{ categoryEditingId ? '保存并同步预览' : '创建并同步预览' }}</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="tagModalVisible" preset="card" :title="tagEditingId ? '编辑标签' : '新增标签'" class="admin-dialog" :bordered="false">
      <NForm label-placement="top">
        <NFormItem label="标签名称">
          <NInput v-model:value="tagForm.name" placeholder="例如：Vue" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="tagModalVisible = false">取消</NButton>
          <NButton type="primary" :loading="loading" @click="saveTag">{{ tagEditingId ? '保存并同步预览' : '创建并同步预览' }}</NButton>
        </NSpace>
      </template>
    </NModal>
  </section>
</template>
