import { computed, ref } from 'vue';

const THEME_KEY = 'quota_theme';
const LEGACY_THEME_KEY = 'darkMode';
const VALID_THEMES = new Set(['light', 'dark']);

function hasBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function savedTheme() {
  if (!hasBrowser()) return '';
  const saved = localStorage.getItem(THEME_KEY);
  if (VALID_THEMES.has(saved)) return saved;

  const legacy = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacy === 'true') return 'dark';
  return '';
}

function initialTheme() {
  return savedTheme() || 'dark';
}

const theme = ref(initialTheme());

export function applyTheme(value = theme.value) {
  if (!hasBrowser()) return;
  const next = VALID_THEMES.has(value) ? value : 'dark';
  document.documentElement.classList.toggle('dark', next === 'dark');
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  localStorage.setItem(LEGACY_THEME_KEY, next === 'dark' ? 'true' : 'false');
}

export function initTheme() {
  theme.value = initialTheme();
  applyTheme(theme.value);
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark');
  const themeLabel = computed(() => (isDark.value ? 'Clar' : 'Fosc'));
  const themeAriaLabel = computed(() =>
    isDark.value ? 'Canvia al mode clar' : 'Canvia al mode fosc'
  );

  function setTheme(value) {
    theme.value = VALID_THEMES.has(value) ? value : 'light';
    applyTheme(theme.value);
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark');
  }

  return {
    theme,
    isDark,
    themeLabel,
    themeAriaLabel,
    setTheme,
    toggleTheme,
  };
}
