<script setup lang="ts">
import { NButton, NCard, NForm, NFormItem, NH1, NInput, NP, useMessage } from 'naive-ui';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { ApiError } from '@/api/http';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();
const submitting = ref(false);
const errorMessage = ref('');

const form = reactive({
  username: '',
  password: '',
});

const handleLogin = async () => {
  errorMessage.value = '';
  submitting.value = true;

  try {
    await authStore.login(form);
    message.success('登录成功');
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } catch (error) {
    const apiError = error as ApiError;
    errorMessage.value = apiError.message || '登录失败，请检查用户名和密码';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <main class="login-page">
    <section class="login-visual">
      <div class="login-orbit orbit-one" />
      <div class="login-orbit orbit-two" />
      <div class="login-copy">
        <span class="brand-mark large">KB</span>
        <NH1>让部门知识沉淀下来</NH1>
        <NP>登录后可以浏览、发布、评论和管理内部知识内容。</NP>
      </div>
    </section>

    <NCard class="login-card" title="登录知识库" bordered>
      <NForm :model="form" @submit.prevent="handleLogin">
        <NFormItem label="用户名">
          <NInput v-model:value="form.username" placeholder="请输入用户名" autofocus />
        </NFormItem>
        <NFormItem label="密码">
          <NInput
            v-model:value="form.password"
            placeholder="请输入密码"
            type="password"
            show-password-on="click"
            @keyup.enter="handleLogin"
          />
        </NFormItem>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
        <NButton type="primary" block size="large" :loading="submitting" @click="handleLogin">
          登录
        </NButton>
      </NForm>
    </NCard>
  </main>
</template>
