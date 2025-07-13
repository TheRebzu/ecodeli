"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Globe, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayout } from "@/components/layout/providers/layout-provider";

const languages = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
];

interface LanguageSwitcherProps {
  variant?: "default" | "minimal" | "icon-only";
  className?: string;
}

export function LanguageSwitcher({
  variant = "default",
  className,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { setLocale } = useLayout();

  const currentLanguage =
    languages.find((lang) => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: string) => {
    // Mettre à jour le contexte
    setLocale(newLocale);

    // Construire la nouvelle URL
    const segments = pathname.split("/");
    segments[1] = newLocale; // Remplacer la locale dans l'URL
    const newPathname = segments.join("/");

    // Naviguer vers la nouvelle URL
    router.push(newPathname);
    setIsOpen(false);
  };

  // Variante icon-only
  if (variant === "icon-only") {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted",
            className,
          )}
          aria-label="Changer de langue"
        >
          <Globe className="h-5 w-5 text-muted-foreground" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={cn(
                    "w-full px-4 py-3 text-left flex items-center space-x-3",
                    "hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg",
                    language.code === locale && "bg-primary/5 text-primary",
                  )}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span className="flex-1 font-medium">{language.name}</span>
                  {language.code === locale && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Variante minimal
  if (variant === "minimal") {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm",
            "hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted",
            className,
          )}
        >
          <span>{currentLanguage.flag}</span>
          <span className="font-medium">
            {currentLanguage.code.toUpperCase()}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-36 bg-background border border-border rounded-lg shadow-lg z-50">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={cn(
                    "w-full px-3 py-2 text-left flex items-center space-x-2",
                    "hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg text-sm",
                    language.code === locale && "bg-primary/5 text-primary",
                  )}
                >
                  <span>{language.flag}</span>
                  <span className="font-medium">
                    {language.code.toUpperCase()}
                  </span>
                  {language.code === locale && (
                    <Check className="h-3 w-3 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Variante default
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center space-x-3 px-4 py-2 rounded-lg border border-border",
          "hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-muted",
          "bg-background text-foreground",
          className,
        )}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center space-x-2">
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="font-medium">{currentLanguage.name}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "transform rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-lg z-50">
            <div className="p-2">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={cn(
                    "w-full px-3 py-3 text-left flex items-center space-x-3 rounded-md",
                    "hover:bg-muted transition-colors",
                    language.code === locale
                      ? "bg-primary/10 text-primary"
                      : "text-foreground",
                  )}
                >
                  <span className="text-lg">{language.flag}</span>
                  <div className="flex-1">
                    <div className="font-medium">{language.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {language.code === "fr"
                        ? "Français (France)"
                        : "English (US)"}
                    </div>
                  </div>
                  {language.code === locale && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-border p-2">
              <div className="text-xs text-muted-foreground px-3 py-2">
                Plus de langues bientôt disponibles
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
