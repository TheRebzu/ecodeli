"use client";

import React, { useEffect, useState } from "react";

/**
 * Hook pour détecter les media queries
 * Utilisé pour le responsive design et l'état mobile
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Définir l'état initial
    setMatches(mediaQuery.matches);

    // Fonction de callback pour les changements
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Ajouter l'écouteur d'événements
    mediaQuery.addEventListener("change", handleChange);

    // Nettoyer l'écouteur lors du démontage
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
