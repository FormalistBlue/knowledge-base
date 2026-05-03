<script setup lang="ts">
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NH2,
  NInput,
  NModal,
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
const createModalVisible = ref(false);
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
const savingPasswordIds = reactive<Record<string, boolean>>({});

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

const resetCreateForm = () => {
  createForm.username = '';
  createForm.displayName = '';
  createForm.password = '';
  createForm.role = 'USER';
};

const openCreateModal = () => {
  resetCreateForm();
  createModalVisible.value = true;
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
    createModalVisible.value = false;
    resetCreateForm();
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

const resetPassword = async (user: CurrentUser, showValidation = true) => {
  const newPassword = resetPasswords[user.id];
  if (!newPassword) {
    return;
  }
  if (newPassword.length < 8) {
    if (showValidation) {
      message.warning('请输入至少 8 位新密码');
    }
    return;
  }
  if (savingPasswordIds[user.id]) {
    return;
  }

  savingPasswordIds[user.id] = true;
  try {
    await authApi.resetUserPassword(user.id, newPassword);
    resetPasswords[user.id] = '';
    message.success(`已重置 ${user.displayName} 的密码`);
  } catch (error) {
    message.error(getErrorMessage(error, '重置密码失败'));
  } finally {
    savingPasswordIds[user.id] = false;
  }
};

const handlePasswordKeydown = (event: KeyboardEvent, user: CurrentUser) => {
  if (event.key !== 'Enter') {
    return;
  }

  event.preventDefault();
  void resetPassword(user);
};

const handlePasswordBlur = (user: CurrentUser) => {
  void resetPassword(user, false);
};

const resetPasswordByButton = async (user: CurrentUser) => {
  if (savingPasswordIds[user.id] || !resetPasswords[user.id]) {
    return;
  }
  if (resetPasswords[user.id].length < 8) {
    message.warning('请输入至少 8 位新密码');
    return;
  }

  await resetPassword(user);
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
    width: 320,
    render(row) {
      return h(NSpace, { align: 'center', wrap: false, class: 'reset-password-cell' }, () => [
        h(NInput, {
          value: resetPasswords[row.id] ?? '',
          type: 'password',
          showPasswordOn: 'click',
          placeholder: '新密码',
          size: 'small',
          class: 'reset-password-input',
          disabled: Boolean(savingPasswordIds[row.id]),
          'onUpdate:value': (value: string) => {
            resetPasswords[row.id] = value;
          },
          onBlur: () => handlePasswordBlur(row),
          onKeydown: (event: KeyboardEvent) => handlePasswordKeydown(event, row),
        }),
        h(
          NButton,
          { size: 'small', secondary: true, loading: Boolean(savingPasswordIds[row.id]), onClick: () => resetPasswordByButton(row) },
          { default: () => '重置' },
        ),
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

      <NCard title="用户列表">
        <template #header-extra>
          <NButton type="primary" @click="openCreateModal">新增用户</NButton>
        </template>
        <NDataTable :loading="loading" :columns="columns" :data="users" :pagination="false" />
        <NPagination class="table-pagination" v-model:page="query.page" :page-size="query.pageSize" :item-count="total" @update:page="loadUsers" />
      </NCard>

      <NModal v-model:show="createModalVisible" preset="card" title="新增用户" class="admin-dialog" :bordered="false">
        <NForm label-placement="top">
          <NFormItem label="用户名">
            <NInput v-model:value="createForm.username" placeholder="请输入用户名" />
          </NFormItem>
          <NFormItem label="显示名">
            <NInput v-model:value="createForm.displayName" placeholder="请输入显示名" />
          </NFormItem>
          <NFormItem label="初始密码">
            <NInput v-model:value="createForm.password" type="password" show-password-on="click" placeholder="至少 8 位密码" />
          </NFormItem>
          <NFormItem label="角色">
            <NSelect v-model:value="createForm.role" :options="roleOptions.slice(1)" />
          </NFormItem>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="createModalVisible = false">取消</NButton>
            <NButton type="primary" :loading="loading" @click="createUser">创建</NButton>
          </NSpace>
        </template>
      </NModal>
    </NSpace>
  </section>
</template>
