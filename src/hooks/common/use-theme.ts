'use client';

import { useTheme as useNextTheme } from 'next-themes';

/**
 * Hook personnalisé pour gérer le thème de l'application
 * Wrapper autour de useTheme de next-themes
 */
export function useTheme() {
  return useNextTheme();
} 