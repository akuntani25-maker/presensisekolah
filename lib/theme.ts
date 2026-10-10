'use client';
import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Hook untuk membaca & mengganti tema. Preferensi disimpan di localStorage. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    try {
      const el = document.documentElement.getAttribute('data-theme') as Theme | null;
      if (el === 'dark' || el === 'light') setThemeState(el);
    } catch {}
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('theme', t);
    } catch {}
  };
  return [theme, setTheme];
}
