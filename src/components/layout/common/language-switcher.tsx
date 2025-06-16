"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger} from "@/components/ui/dropdown-menu";

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageSwitcherProps {
  locale: string;
  className?: string;
}

const languages: Language[] = [
  {
    code: "fr",
    name: "Français",
    flag: "🇫🇷"},
  {
    code: "en",
    name: "English",
    flag: "🇬🇧"},
  {
    code: "ar",
    name: "العربية",
    flag: "🇲🇦"}];

export function LanguageSwitcher({ locale, className }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const currentLanguage =
    languages.find((lang) => lang.code === locale) || languages[0];

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === locale) return;

    setIsLoading(true);

    try {
      // Construire la nouvelle URL avec la nouvelle locale
      const segments = pathname.split("/").filter(Boolean);

      // Retirer l'ancienne locale si elle existe
      if (languages.some((lang) => lang.code === segments[0])) {
        segments.shift();
      }

      // Ajouter la nouvelle locale
      const newPath = `/${newLocale}/${segments.join("/")}`;

      router.push(newPath);
    } catch (error) {
      console.error("Erreur lors du changement de langue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          disabled={isLoading}
        >
          <Globe className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{currentLanguage.flag}</span>
          <span className="ml-1 hidden md:inline">{currentLanguage.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center">
              <span className="mr-2">{language.flag}</span>
              <span>{language.name}</span>
            </div>
            {language.code === locale && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
