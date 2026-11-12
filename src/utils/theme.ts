import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'prayogshala_theme_v1';

/** Resolve the initial theme: explicit ?theme= override, saved choice, then OS preference. */
export function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  try {
    const override = new URLSearchParams(window.location.search).get('theme');
    if (override === 'dark' || override === 'light') return override;
  } catch {
    // Ignore malformed query strings
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // Ignore storage access errors (private mode)
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply the theme to <html>, keeping the browser chrome (theme-color) in sync. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#060d14' : '#0e7490');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota / privacy errors
    }
  }, [theme]);

  // Keep multiple open tabs in sync when the preference changes elsewhere.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      if (event.newValue === 'dark' || event.newValue === 'light') {
        setTheme(event.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
