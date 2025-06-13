"use client";

import Link, { LinkProps } from "next/link";
import { useParams } from "next/navigation";
import { ReactNode } from "react";

/**
 * Un composant Link adapté pour gérer correctement les routes dans les groupes de routes parenthésés.
 * Ce composant s'assure que les URL sont correctement construites et que la locale est préservée.
 */
interface AppLinkProps extends Omit<LinkProps, "href"> {
  /** Le chemin à utiliser sans le préfixe locale */
  href: string;
  children: ReactNode;
  /** Locale à utiliser, si non fourni, utilisera la locale courante */
  locale?: string;
  className?: string;
}

export default function AppLink({
  href,
  children,
  locale,
  className,
  ...props
}: AppLinkProps) {
  // Récupérer la locale actuelle depuis les paramètres d'URL
  const params = useParams();
  const currentLocale = (params.locale as string) || "fr";

  // Utiliser la locale fournie ou celle actuelle
  const targetLocale = locale || currentLocale;

  // Construire l'URL complète avec la locale
  const fullHref = href.startsWith("/")
    ? `/${targetLocale}${href}`
    : `/${targetLocale}/${href}`;

  return (
    <Link href={fullHref} className={className} {...props}>
      {children}
    </Link>
  );
}
