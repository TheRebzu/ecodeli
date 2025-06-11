'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

export function ThemeInitializer() {
  const { theme } = useTheme();

  useEffect(() => {
    // Initialiser le thème côté client
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return null;
} 