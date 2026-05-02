import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useThemeStore } from './theme';

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    setActivePinia(createPinia());
  });

  it('persists dark theme preference and applies it to the document root', () => {
    const store = useThemeStore();

    store.setDark(true);

    expect(store.isDark).toBe(true);
    expect(localStorage.getItem('knowledge-base-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('restores saved dark theme during initialization', () => {
    localStorage.setItem('knowledge-base-theme', 'dark');
    setActivePinia(createPinia());

    const store = useThemeStore();
    store.initTheme();

    expect(store.isDark).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles between light and dark themes', () => {
    const store = useThemeStore();

    store.toggleTheme();
    expect(localStorage.getItem('knowledge-base-theme')).toBe('dark');

    store.toggleTheme();
    expect(store.isDark).toBe(false);
    expect(localStorage.getItem('knowledge-base-theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
