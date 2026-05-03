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
  NPagination,
  NSelect,
  NSpace,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';

import { authApi } from '@/api/auth';
import type { CreateUserPayload, CurrentUser, UserRole, UserStatus } from '@/types/auth';
import { getErrorMessage } from '@/utils/error-message';

const message = useMessage();
const loading = ref(false);
const users = ref<CurrentUser[]>([]);
const total = ref(0);
const query = reactive({ page: 1, pageSize: 10, keyword: '', role: null as UserRole | null, status: null as UserStatus | null });
const selectedRole = computed({
  get: () => query.role ?? '',
  set: (value: string) => {
    query.role = value ? (value as UserRole) : null;
  },
});
const selectedStatus = computed({
  get: () => query.status ?? '',
  set: (value: string) => {
    query.status = value ? (value as UserStatus) : null;
  },
});
const createForm = reactive<CreateUserPayload>({ username: '', displayName: '', password: '', role: 'USER' });
const resetPasswords = reactive<Record<string, string>>({});

const roleOptions = [
  { label: '全部角色', value: '' },
  { label: '管理员', value: 'ADMIN' },
  { label: '普通成员', value: 'USER' },
];
const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'ACTIVE' },
  { label: '禁用', value: 'DISABLED' },
];

const loadUsers = async () => {
  loading.value = true;
  try {
    const result = await authApi.listUsers({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      role: query.role || undefined,
      status: query.status || undefined,
    });
    users.value = result.items;
    total.value = result.total;
  } finally {
    loading.value = false;
  }
};

const searchUsers = async () => {
  query.page = 1;
  await loadUsers();
};

const createUser = async () => {
  if (!createForm.username.trim() || !createForm.displayName.trim() || createForm.password.length < 8) {
    message.warning('请填写用户名、显示名和至少 8 位密码');
    return;
  }

  loading.value = true;
  try {
    await authApi.createUser({ ...createForm });
    message.success('用户已创建');
    createForm.username = '';
    createForm.displayName = '';
    createForm.password = '';
    createForm.role = 'USER';
    await loadUsers();
  } catch (error) {
    message.error(getErrorMessage(error, '创建用户失败'));
  } finally {
    loading.value = false;
  }
};

const toggleStatus = async (user: CurrentUser) => {
  await authApi.updateUserStatus(user.id, user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE');
  message.success(user.status === 'ACTIVE' ? '用户已禁用' : '用户已启用');
  await loadUsers();
};

const resetPassword = async (user: CurrentUser) => {
  const newPassword = resetPasswords[user.id];
  if (!newPassword || newPassword.length < 8) {
    message.warning('请输入至少 8 位新密码');
    return;
  }
  await authApi.resetUserPassword(user.id, newPassword);
  resetPasswords[user.id] = '';
  message.success(`已重置 ${user.displayName} 的密码`);
};

const columns: DataTableColumns<CurrentUser> = [
  { title: '用户名', key: 'username' },
  { title: '显示名', key: 'displayName' },
  { title: '角色', key: 'role', render: (row) => h(NTag, { type: row.role === 'ADMIN' ? 'warning' : 'info', size: 'small' }, { default: () => row.role }) },
  { title: '状态', key: 'status', render: (row) => h(NTag, { type: row.status === 'ACTIVE' ? 'success' : 'error', size: 'small' }, { default: () => row.status }) },
  { title: '最后登录', key: 'lastLoginAt', render: (row) => (row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : '-') },
  {
    title: '重置密码',
    key: 'reset',
    width: 260,
    render(row) {
      return h(NSpace, { align: 'center' }, () => [
        h(NInput, {
          value: resetPasswords[row.id] ?? '',
          type: 'password',
          showPasswordOn: 'click',
          placeholder: '新密码',
          size: 'small',
          'onUpdate:value': (value: string) => {
            resetPasswords[row.id] = value;
          },
        }),
        h(NButton, { size: 'small', secondary: true, onClick: () => resetPassword(row) }, { default: () => '重置' }),
      ]);
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render(row) {
      return h(
        NButton,
        { size: 'small', type: row.status === 'ACTIVE' ? 'error' : 'success', secondary: true, onClick: () => toggleStatus(row) },
        { default: () => (row.status === 'ACTIVE' ? '禁用' : '启用') },
      );
    },
  },
];

onMounted(loadUsers);
</script>

<template>
  <section>
    <NSpace vertical size="large">
      <NCard>
        <NTag type="info" round>Admin</NTag>
        <NH2>用户管理</NH2>
        <NSpace align="center" wrap>
          <NInput v-model:value="query.keyword" clearable placeholder="搜索用户名或显示名" @keyup.enter="searchUsers" />
          <NSelect v-model:value="selectedRole" :options="roleOptions" class="filter-control" />
          <NSelect v-model:value="selectedStatus" :options="statusOptions" class="filter-control" />
          <NButton type="primary" @click="searchUsers">搜索</NButton>
        </NSpace>
      </NCard>

      <NCard title="创建用户">
        <NForm label-placement="top">
          <NGrid :cols="4" :x-gap="16" responsive="screen">
            <NGi><NFormItem label="用户名"><NInput v-model:value="createForm.username" /></NFormItem></NGi>
            <NGi><NFormItem label="显示名"><NInput v-model:value="createForm.displayName" /></NFormItem></NGi>
            <NGi><NFormItem label="初始密码"><NInput v-model:value="createForm.password" type="password" show-password-on="click" /></NFormItem></NGi>
            <NGi><NFormItem label="角色"><NSelect v-model:value="createForm.role" :options="roleOptions.slice(1)" /></NFormItem></NGi>
          </NGrid>
          <NButton type="primary" @click="createUser">创建用户</NButton>
        </NForm>
      </NCard>

      <NCard title="用户列表">
        <NDataTable :loading="loading" :columns="columns" :data="users" :pagination="false" />
        <NPagination v-model:page="query.page" :page-size="query.pageSize" :item-count="total" @update:page="loadUsers" />
      </NCard>
    </NSpace>
  </section>
</template>
