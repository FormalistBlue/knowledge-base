/// <reference types="../../../node_modules/.pnpm/@vue+language-core@3.2.7/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../node_modules/.pnpm/@vue+language-core@3.2.7/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { darkTheme, NConfigProvider, NMessageProvider } from 'naive-ui';
import { computed } from 'vue';
import { useThemeStore } from './stores/theme';
const themeStore = useThemeStore();
const naiveTheme = computed(() => (themeStore.isDark ? darkTheme : null));
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.NConfigProvider | typeof __VLS_components.NConfigProvider} */
NConfigProvider;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    theme: (__VLS_ctx.naiveTheme),
}));
const __VLS_2 = __VLS_1({
    theme: (__VLS_ctx.naiveTheme),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.NMessageProvider | typeof __VLS_components.NMessageProvider} */
NMessageProvider;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({}));
const __VLS_9 = __VLS_8({}, ...__VLS_functionalComponentArgsRest(__VLS_8));
const { default: __VLS_12 } = __VLS_10.slots;
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.RouterView} */
RouterView;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({}));
const __VLS_15 = __VLS_14({}, ...__VLS_functionalComponentArgsRest(__VLS_14));
// @ts-ignore
[naiveTheme,];
var __VLS_10;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
