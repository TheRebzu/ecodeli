'use client'

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

/**
 * Composant de changement de langue pour EcoDeli
 * Utilise le système i18n unifié avec @/i18n
 */
export function LanguageSwitcher() {
  const locale = useLocale() as "fr" | "en";
  const router = useRouter();
  const pathname = usePathname();
  
  const isEnglish = locale === "en";
  const isFrench = locale === "fr";

  const handleLanguageChange = (newLocale: "fr" | "en") => {
    // Navigation vers la même page avec la nouvelle locale
    router.push(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {isFrench ? "Français" : "English"}
          </span>
          <span className="sm:hidden">
            {locale.toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange("fr")}
          className={isFrench ? "bg-accent" : ""}
        >
          <span className="mr-2">🇫🇷</span>
          Français
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange("en")}
          className={isEnglish ? "bg-accent" : ""}
        >
          <span className="mr-2">🇬🇧</span>
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 