"use client";

import { useRouter, useParams } from "next/navigation";

/**
 * Hook personnalisé pour la navigation qui gère correctement les routes avec des groupes parenthésés.
 * Ce hook prend en charge l'internationalisation et s'assure que la locale est préservée.
 */
export function useAppNavigation() {
  const router = useRouter();
  const params = useParams();
  const currentLocale = (params.locale as string) || "fr";

  /**
   * Navigue vers une route en préservant la locale actuelle
   * @param path Le chemin à naviguer (sans le préfixe de locale)
   * @param locale La locale à utiliser (optionnel, utilise la locale actuelle par défaut)
   */
  const navigateTo = (path: string, locale?: string) => {
    const targetLocale = locale || currentLocale;
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    router.push(`/${targetLocale}${formattedPath}`);
  };

  /**
   * Redirige vers une route en préservant la locale actuelle
   * @param path Le chemin à rediriger (sans le préfixe de locale)
   * @param locale La locale à utiliser (optionnel, utilise la locale actuelle par défaut)
   */
  const redirectTo = (path: string, locale?: string) => {
    const targetLocale = locale || currentLocale;
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    window.location.href = `/${targetLocale}${formattedPath}`;
  };

  /**
   * Génère une URL complète avec la locale
   * @param path Le chemin (sans le préfixe de locale)
   * @param locale La locale à utiliser (optionnel, utilise la locale actuelle par défaut)
   * @returns L'URL complète avec la locale
   */
  const getLocalizedUrl = (path: string, locale?: string) => {
    const targetLocale = locale || currentLocale;
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    return `/${targetLocale}${formattedPath}`;
  };

  return {
    navigateTo,
    redirectTo,
    getLocalizedUrl,
    currentLocale};
}
