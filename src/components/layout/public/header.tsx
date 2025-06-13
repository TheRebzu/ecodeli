"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/common";
import { ModeToggle } from "@/components/ui/mode-toggle";

// Définition des props du header public
interface PublicHeaderProps {
  locale?: string;
}

// Palette verte foncée pour le dark mode
const DARK_BG = "dark:bg-green-950"; // ou dark:bg-[#10291a] pour un vert très foncé
const DARK_BORDER = "dark:border-green-900";
const DARK_TEXT = "dark:text-green-300";
const DARK_HOVER = "dark:hover:bg-green-900";

export function PublicHeader({ locale = "fr" }: PublicHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);

  // Définition de la navigation principale
  const mainNav = [
    { name: "Accueil", href: `/${locale}/home` },
    { name: "Services", href: `/${locale}/services` },
    { name: "Tarifs", href: `/${locale}/pricing` },
    {
      name: "Devenir partenaire",
      children: [
        { name: "Devenir livreur", href: `/${locale}/become-delivery` },
        { name: "Devenir commerçant", href: `/${locale}/merchant/register` },
        { name: "Devenir prestataire", href: `/${locale}/provider/register` },
      ],
    },
    { name: "À propos", href: `/${locale}/about` },
    { name: "Contact", href: `/${locale}/contact` },
  ];

  // Rendu des liens de navigation (desktop)
  const renderNavLinks = () => (
    <nav className="hidden lg:flex gap-2 items-center" aria-label="Navigation principale">
      {mainNav.map((item, idx) =>
        item.children ? (
          <div key={idx} className="relative group">
            <button
              className={`flex items-center gap-1 px-3 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none dark:text-green-200 ${DARK_HOVER}`}
              aria-haspopup="true"
              aria-expanded={submenuOpen ? "true" : "false"}
              onMouseEnter={() => setSubmenuOpen(true)}
              onMouseLeave={() => setSubmenuOpen(false)}
              onFocus={() => setSubmenuOpen(true)}
              onBlur={() => setSubmenuOpen(false)}
              tabIndex={0}
              type="button"
            >
              {item.name}
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            {/* Sous-menu */}
            <div
              className={cn(
                `absolute left-0 mt-2 min-w-[200px] bg-white shadow-lg rounded-md border z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 dark:bg-green-950 dark:border-green-900`,
                submenuOpen && "opacity-100 pointer-events-auto"
              )}
              onMouseEnter={() => setSubmenuOpen(true)}
              onMouseLeave={() => setSubmenuOpen(false)}
            >
              {item.children.map((child, cidx) => (
                <Link
                  key={cidx}
                  href={child.href}
                  className={`block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors dark:text-green-100 ${DARK_HOVER}`}
                  tabIndex={0}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link
            key={idx}
            href={item.href}
            className={cn(
              `px-3 py-2 rounded-md font-medium text-gray-700 hover:bg-gray-100 transition-colors dark:text-green-100 ${DARK_HOVER}`,
              pathname === item.href && "text-green-600 dark:text-green-300 font-semibold"
            )}
          >
            {item.name}
          </Link>
        )
      )}
    </nav>
  );

  // Rendu du menu mobile (drawer)
  const renderMobileMenu = () => (
    <div
      className={cn(
        "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
        mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      aria-hidden={!mobileOpen}
      onClick={() => setMobileOpen(false)}
    >
      <aside
        className={cn(
          `absolute left-0 top-0 h-full w-72 bg-white shadow-lg p-6 flex flex-col gap-6 transform transition-transform duration-300 dark:bg-green-950 dark:border-r dark:border-green-900`,
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={e => e.stopPropagation()}
        aria-label="Menu mobile"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xl font-bold text-green-600 dark:text-green-300">EcoDeli</span>
          <button
            className={`p-2 rounded hover:bg-gray-100 dark:hover:bg-green-900`}
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Navigation mobile">
          {mainNav.map((item, idx) =>
            item.children ? (
              <div key={idx} className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-green-200 mb-1">{item.name}</span>
                <div className="pl-3 border-l border-gray-200 dark:border-green-900 flex flex-col gap-1">
                  {item.children.map((child, cidx) => (
                    <Link
                      key={cidx}
                      href={child.href}
                      className={`py-1 text-gray-600 hover:text-green-600 transition-colors dark:text-green-100 dark:hover:text-green-300`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={idx}
                href={item.href}
                className={cn(
                  `py-2 px-1 rounded text-gray-700 hover:bg-gray-100 transition-colors dark:text-green-100 ${DARK_HOVER}`,
                  pathname === item.href && "text-green-600 dark:text-green-300 font-semibold"
                )}
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            )
          )}
        </nav>
        {/* Actions utilisateur + dark mode (mobile) */}
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="ghost" asChild className="w-full">
            <Link href={`/${locale}/login`} onClick={() => setMobileOpen(false)}>
              Se connecter
            </Link>
          </Button>
          <Button asChild className="w-full">
            <Link href={`/${locale}/register/client`} onClick={() => setMobileOpen(false)}>
              S'inscrire
            </Link>
          </Button>
          {/* Bouton dark mode mobile */}
          <div className="mt-2 flex justify-center">
            <ModeToggle />
          </div>
        </div>
      </aside>
    </div>
  );

  // Rendu principal du header
  return (
    <header className={`sticky top-0 z-50 bg-white shadow-sm border-b transition-shadow dark:bg-green-950 dark:border-green-900`}>
      {/* Barre supérieure : logo, navigation, actions */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo EcoDeli */}
        <Link href={`/${locale}/home`} className="flex items-center gap-2 group" aria-label="Accueil EcoDeli">
          <span className="text-2xl font-bold text-green-600 dark:text-green-300 group-hover:scale-105 transition-transform">EcoDeli</span>
          <span className="text-xs text-gray-500 dark:text-green-200 hidden sm:block">Livraison écologique</span>
        </Link>
        {/* Navigation principale (desktop) */}
        {renderNavLinks()}
        {/* Actions utilisateur (desktop) + dark mode */}
        <div className="hidden lg:flex gap-2 items-center">
          <Button variant="ghost" asChild>
            <Link href={`/${locale}/login`}>Se connecter</Link>
          </Button>
          <Button asChild>
            <Link href={`/${locale}/register/client`}>S'inscrire</Link>
          </Button>
          {/* Bouton dark mode desktop */}
          <ModeToggle />
        </div>
        {/* Bouton menu mobile */}
        <button
          className={`lg:hidden p-2 rounded hover:bg-gray-100 transition-colors dark:hover:bg-green-900`}
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
      {/* Menu mobile (drawer) */}
      {renderMobileMenu()}
    </header>
  );
}

// Par défaut, export du composant
export default PublicHeader;
