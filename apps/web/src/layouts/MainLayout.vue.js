/// <reference types="../../../../node_modules/.pnpm/@vue+language-core@3.2.7/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../node_modules/.pnpm/@vue+language-core@3.2.7/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5';
import { NButton, NIcon, NLayout, NLayoutContent, NLayoutHeader, NSpace, NText } from 'naive-ui';
import { useThemeStore } from '@/stores/theme';
const themeStore = useThemeStore();
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.NLayout | typeof __VLS_components.NLayout} */
NLayout;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ class: "app-shell" },
}));
const __VLS_2 = __VLS_1({
    ...{ class: "app-shell" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
const { default: __VLS_6 } = __VLS_3.slots;
let __VLS_7;
/** @ts-ignore @type {typeof __VLS_components.NLayoutHeader | typeof __VLS_components.NLayoutHeader} */
NLayoutHeader;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
    bordered: true,
    ...{ class: "app-header" },
}));
const __VLS_9 = __VLS_8({
    bordered: true,
    ...{ class: "app-header" },
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
/** @type {__VLS_StyleScopedClasses['app-header']} */ ;
const { default: __VLS_12 } = __VLS_10.slots;
let __VLS_13;
/** @ts-ignore @type {typeof __VLS_components.NSpace | typeof __VLS_components.NSpace} */
NSpace;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    align: "center",
    justify: "space-between",
}));
const __VLS_15 = __VLS_14({
    align: "center",
    justify: "space-between",
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
const { default: __VLS_18 } = __VLS_16.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand" },
});
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "brand-mark" },
});
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.NText | typeof __VLS_components.NText} */
NText;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
    strong: true,
}));
const __VLS_21 = __VLS_20({
    strong: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
const { default: __VLS_24 } = __VLS_22.slots;
var __VLS_22;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['brand-subtitle']} */ ;
let __VLS_25;
/** @ts-ignore @type {typeof __VLS_components.NButton | typeof __VLS_components.NButton} */
NButton;
// @ts-ignore
const __VLS_26 = __VLS_asFunctionalComponent1(__VLS_25, new __VLS_25({
    ...{ 'onClick': {} },
    secondary: true,
    circle: true,
}));
const __VLS_27 = __VLS_26({
    ...{ 'onClick': {} },
    secondary: true,
    circle: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_26));
let __VLS_30;
const __VLS_31 = ({ click: {} },
    { onClick: (__VLS_ctx.themeStore.toggleTheme) });
const { default: __VLS_32 } = __VLS_28.slots;
{
    const { icon: __VLS_33 } = __VLS_28.slots;
    let __VLS_34;
    /** @ts-ignore @type {typeof __VLS_components.NIcon} */
    NIcon;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({
        component: (__VLS_ctx.themeStore.isDark ? __VLS_ctx.SunnyOutline : __VLS_ctx.MoonOutline),
    }));
    const __VLS_36 = __VLS_35({
        component: (__VLS_ctx.themeStore.isDark ? __VLS_ctx.SunnyOutline : __VLS_ctx.MoonOutline),
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    // @ts-ignore
    [themeStore, themeStore, SunnyOutline, MoonOutline,];
}
// @ts-ignore
[];
var __VLS_28;
var __VLS_29;
// @ts-ignore
[];
var __VLS_16;
// @ts-ignore
[];
var __VLS_10;
let __VLS_39;
/** @ts-ignore @type {typeof __VLS_components.NLayoutContent | typeof __VLS_components.NLayoutContent} */
NLayoutContent;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({
    ...{ class: "app-content" },
}));
const __VLS_41 = __VLS_40({
    ...{ class: "app-content" },
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
/** @type {__VLS_StyleScopedClasses['app-content']} */ ;
const { default: __VLS_44 } = __VLS_42.slots;
let __VLS_45;
/** @ts-ignore @type {typeof __VLS_components.RouterView} */
RouterView;
// @ts-ignore
const __VLS_46 = __VLS_asFunctionalComponent1(__VLS_45, new __VLS_45({}));
const __VLS_47 = __VLS_46({}, ...__VLS_functionalComponentArgsRest(__VLS_46));
// @ts-ignore
[];
var __VLS_42;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
