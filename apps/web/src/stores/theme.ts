import { defineStore } from 'pinia';

const THEME_KEY = 'knowledge-base-theme';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDark: localStorage.getItem(THEME_KEY) === 'dark',
  }),
  actions: {
    setDark(isDark: boolean) {
      this.isDark = isDark;
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    },
    toggleTheme() {
      this.setDark(!this.isDark);
    },
    initTheme() {
      this.setDark(this.isDark);
    },
  },
});
