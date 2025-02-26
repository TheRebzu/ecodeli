"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"

// Liste des langues disponibles
const languages = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" }
]

export function LanguageSwitcher() {
  const [currentLanguage, setCurrentLanguage] = useState("fr")
  const [mounted, setMounted] = useState(false)

  // Récupération de la langue enregistrée dans le localStorage
  useEffect(() => {
    setMounted(true)
    const savedLanguage = localStorage.getItem("ecodeli-language") || "fr"
    setCurrentLanguage(savedLanguage)
  }, [])

  // Changement de langue
  const changeLanguage = (langCode: string) => {
    setCurrentLanguage(langCode)
    localStorage.setItem("ecodeli-language", langCode)

    // Ici, vous intégreriez votre logique de traduction
    // Par exemple avec i18next ou une autre bibliothèque
    document.documentElement.lang = langCode

    // Déclencher un événement pour informer l'application du changement de langue
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: langCode }))
  }

  // Récupération des informations de la langue actuelle
  const currentLangInfo = languages.find(lang => lang.code === currentLanguage) || languages[0]

  if (!mounted) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-ecodeli-700 dark:text-ecodeli-300 hover:bg-ecodeli-100 dark:hover:bg-ecodeli-800"
        >
          <Globe className="w-4 h-4 mr-1" />
          <span className="mr-1">{currentLangInfo.flag}</span>
          <span className="hidden sm:inline">{currentLangInfo.name}</span>
          <span className="sm:hidden">{currentLangInfo.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className={`flex items-center gap-2 cursor-pointer ${
              language.code === currentLanguage 
                ? "bg-ecodeli-50 dark:bg-ecodeli-800 font-medium" 
                : ""
            }`}
            onClick={() => changeLanguage(language.code)}
          >
            <span className="text-base">{language.flag}</span>
            <span>{language.name}</span>
            {language.code === currentLanguage && (
              <span className="ml-auto h-2 w-2 rounded-full bg-ecodeli-500"></span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}