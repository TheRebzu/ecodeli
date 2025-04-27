'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Ce composant s'assure que les modifications liées au thème
 * sont appliquées uniquement côté client après l'hydratation
 * pour éviter les erreurs de mismatch d'hydratation
 */
export function ThemeInitializer() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Indiquer que le composant est monté (côté client uniquement)
    setMounted(true);
  }, []);

  useEffect(() => {
    // Force l'application du thème après le premier rendu
    // ce qui évite les problèmes d'hydratation
    if (mounted && theme) {
      setTheme(theme);
    }
  }, [theme, setTheme, mounted]);

  return null; // Ce composant ne rend rien visuellement
}
