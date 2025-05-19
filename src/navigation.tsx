'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

interface LinkProps extends React.ComponentPropsWithoutRef<typeof NextLink> {
  children: React.ReactNode;
  locale?: string;
  preserveLocale?: boolean;
}

/**
 * Composant Link qui préserve automatiquement la locale dans les liens
 */
export function Link({ 
  children, 
  href, 
  locale: localeProp, 
  preserveLocale = true, 
  ...rest 
}: LinkProps) {
  const pathname = usePathname();
  const defaultLocale = useLocale();
  const locale = localeProp || defaultLocale;

  let newHref = href;
  
  // Gérer les chemins relatifs et absolus
  if (typeof href === 'string') {
    // Préserver la locale actuelle si demandé
    if (preserveLocale && !href.startsWith('/') && !href.startsWith('#')) {
      newHref = `/${locale}${href.startsWith('/') ? href : `/${href}`}`;
    } else if (preserveLocale && !href.startsWith('/')) {
      // Si c'est un lien relatif, construire le chemin complet
      const pathParts = pathname.split('/');
      pathParts.pop(); // Enlever la dernière partie
      
      let basePath = pathParts.join('/');
      if (!basePath.startsWith(`/${locale}`)) {
        basePath = `/${locale}${basePath}`;
      }
      
      newHref = `${basePath}/${href}`;
    } else if (preserveLocale && !href.includes(`/${locale}/`) && !href.startsWith('#')) {
      // Ajouter la locale au début du chemin si elle n'est pas déjà présente
      newHref = `/${locale}${href.startsWith('/') ? href : `/${href}`}`;
    }
  }

  return (
    <NextLink href={newHref} {...rest}>
      {children}
    </NextLink>
  );
}

/**
 * Hook pour obtenir des liens localisés
 */
export function useLocalizedLinks() {
  const locale = useLocale();
  const t = useTranslations();

  const getLocalizedHref = (path: string): string => {
    if (path.startsWith('/')) {
      return `/${locale}${path}`;
    }
    return `/${locale}/${path}`;
  };

  return {
    getLocalizedHref,
    t,
  };
} 