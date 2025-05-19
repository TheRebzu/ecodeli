'use client';

import { useState, useEffect } from 'react';

/**
 * Hook pour détecter si une media query correspond à l'écran actuel
 * @param query La media query à vérifier (ex: '(max-width: 768px)')
 * @returns Booléen indiquant si la media query correspond
 */
export function useMediaQuery(query: string): boolean {
  // État initial à false (par défaut, la requête ne correspond pas)
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Vérifier si window est disponible (côté client uniquement)
    if (typeof window === 'undefined') {
      return;
    }

    // Créer le media query matcher
    const media = window.matchMedia(query);

    // Mettre à jour l'état initial
    setMatches(media.matches);

    // Fonction de callback pour les changements de media query
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Ajouter l'écouteur d'événements
    media.addEventListener('change', listener);

    // Nettoyer l'écouteur lors du démontage du composant
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]); // Recréer l'effet si la requête change

  return matches;
}

export default useMediaQuery;
