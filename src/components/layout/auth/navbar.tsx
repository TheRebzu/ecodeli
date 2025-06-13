"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface AuthNavbarProps {
  locale: string;
  title?: string;
  showBackButton?: boolean;
  backUrl?: string;
  backText?: string;
  showLanguageSwitcher?: boolean;
  showThemeToggle?: boolean;
  className?: string;
}

export function AuthNavbar({
  locale,
  title = "EcoDeli",
  showBackButton = true,
  backUrl = `/${locale}/home`,
  backText = "Retour à l'accueil",
  showLanguageSwitcher = true,
  showThemeToggle = true,
  className,
}: AuthNavbarProps) {
  return (
    <nav className={`flex justify-between items-center py-4 ${className}`}>
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link href={`/${locale}/home`} className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold">E</span>
          </div>
          <span className="font-bold">{title}</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Bouton retour */}
        {showBackButton && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={backUrl} className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backText}</span>
            </Link>
          </Button>
        )}

        {/* Sélecteurs */}
        <div className="flex items-center gap-2">
          {showLanguageSwitcher && <LanguageSwitcher locale={locale} />}
          {showThemeToggle && <ModeToggle />}
        </div>
      </div>
    </nav>
  );
}
