"use client";

import { useEffect, useState } from "react";

/**
 * Hook personnalisé pour gérer les media queries de manière réactive
 * @param query - La media query à surveiller (ex: "(max-width: 768px)")
 * @returns boolean - true si la media query correspond, false sinon
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Vérifier si window est disponible (côté client)
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);

    // Définir la valeur initiale
    setMatches(mediaQuery.matches);

    // Créer le handler pour les changements
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Ajouter l'écouteur d'événements
    mediaQuery.addEventListener("change", handleChange);

    // Fonction de nettoyage
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;
