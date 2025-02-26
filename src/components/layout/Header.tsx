"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import {
  Leaf, Menu, X, Sun, Moon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Gestion de l'état monté pour éviter les erreurs d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  // Détection du scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Fermer le menu mobile lors du changement de page
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [])

  // Navigation principale
  const mainNavItems = [
    { label: "À propos", href: "/a-propos" },
    { label: "Services", href: "/services" },
    { label: "Contact", href: "/contact" }
  ]

  // Espaces utilisateurs (correspond aux espaces demandés dans la Mission 1)
  const userSpaces = [
    { label: "Espace Livreur", href: "/courier" },
    { label: "Espace Client", href: "/customer" },
    { label: "Espace Commerçant", href: "/merchant" },
    { label: "Espace Prestataire", href: "/provider" }
  ]

  if (!mounted) return null;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? "bg-white/95 dark:bg-ecodeli-950/95 backdrop-blur-md shadow-sm" 
          : "bg-transparent"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="flex items-center p-1.5 rounded-full bg-ecodeli-100 dark:bg-ecodeli-800 group-hover:bg-ecodeli-200 dark:group-hover:bg-ecodeli-700 transition-colors duration-300">
              <Leaf className="h-6 w-6 text-ecodeli-600 dark:text-ecodeli-300 group-hover:text-ecodeli-700 dark:group-hover:text-ecodeli-200 transition-colors duration-300" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-br from-ecodeli-700 to-ecodeli-500 bg-clip-text text-transparent dark:from-ecodeli-300 dark:to-ecodeli-500">
              EcoDeli
            </span>
          </Link>
        </div>

        {/* Menu mobile */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-ecodeli-600 dark:text-ecodeli-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Navigation desktop */}
        <nav className="hidden md:flex items-center space-x-6">
          {mainNavItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-ecodeli-700 hover:text-ecodeli-900 transition-colors dark:text-ecodeli-300 dark:hover:text-ecodeli-100 relative group"
            >
              {item.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-ecodeli-500 dark:bg-ecodeli-400 transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}

          {/* Dropdown pour les espaces utilisateurs */}
          <div className="relative group">
            <button className="text-sm font-medium text-ecodeli-700 hover:text-ecodeli-900 transition-colors dark:text-ecodeli-300 dark:hover:text-ecodeli-100 flex items-center gap-1">
              Espaces
              <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-ecodeli-900 rounded-md shadow-lg overflow-hidden scale-0 group-hover:scale-100 origin-top transition-all duration-200 z-50">
              {userSpaces.map((space) => (
                <Link
                  key={space.label}
                  href={space.href}
                  className="block px-4 py-2 text-sm text-ecodeli-700 hover:bg-ecodeli-50 hover:text-ecodeli-900 dark:text-ecodeli-300 dark:hover:bg-ecodeli-800 dark:hover:text-ecodeli-100"
                >
                  {space.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="hidden md:flex items-center space-x-3">
          {/* Sélecteur de langue */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-ecodeli-100 dark:hover:bg-ecodeli-800 transition-colors duration-300"
            aria-label="Changer de langue"
          >
            <span className="font-medium text-sm">FR</span>
          </Button>

          {/* Sélecteur de thème */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-ecodeli-100 dark:hover:bg-ecodeli-800 transition-colors duration-300"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5 text-amber-400 hover:text-amber-500 transition-colors" />
                  ) : (
                    <Moon className="h-5 w-5 text-ecodeli-600 hover:text-ecodeli-800 transition-colors" />
                  )}
                  <span className="sr-only">Changer le thème</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Basculer vers mode {theme === "dark" ? "clair" : "sombre"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Boutons d'authentification */}
          <Button
            asChild
            variant="ghost"
            className="transition-all duration-300 hover:scale-105 text-ecodeli-700 dark:text-ecodeli-300 hover:text-ecodeli-900 dark:hover:text-ecodeli-100"
          >
            <Link href="/auth/signin">Connexion</Link>
          </Button>
          <Button
            asChild
            className="transition-all duration-300 hover:scale-105 bg-gradient-to-r from-ecodeli-600 to-ecodeli-500 hover:from-ecodeli-700 hover:to-ecodeli-600 text-white dark:from-ecodeli-500 dark:to-ecodeli-600 dark:hover:from-ecodeli-400 dark:hover:to-ecodeli-500 shadow-md hover:shadow-lg"
          >
            <Link href="/auth/signup">Inscription</Link>
          </Button>
        </div>
      </div>

      {/* Menu mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white dark:bg-ecodeli-900 shadow-lg"
          >
            <div className="container py-4 space-y-4">
              <nav className="flex flex-col space-y-3">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-lg font-medium text-ecodeli-700 hover:text-ecodeli-900 transition-colors dark:text-ecodeli-300 dark:hover:text-ecodeli-100 py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}

                {/* Espaces utilisateurs dans le menu mobile */}
                <div className="py-2 border-t border-ecodeli-100 dark:border-ecodeli-800">
                  <p className="text-sm font-semibold text-ecodeli-500 dark:text-ecodeli-400 uppercase mb-2">Espaces</p>
                  {userSpaces.map((space) => (
                    <Link
                      key={space.label}
                      href={space.href}
                      className="block py-2 text-lg font-medium text-ecodeli-700 hover:text-ecodeli-900 transition-colors dark:text-ecodeli-300 dark:hover:text-ecodeli-100"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {space.label}
                    </Link>
                  ))}
                </div>
              </nav>

              <div className="flex flex-col space-y-3 pt-2 border-t border-ecodeli-100 dark:border-ecodeli-800">
                {/* Sélecteur de langue dans le menu mobile */}
                <div className="flex items-center justify-between">
                  <span className="text-ecodeli-700 dark:text-ecodeli-300">Langue</span>
                  <div className="flex space-x-2">
                    <button className="px-2 py-1 text-sm font-medium rounded bg-ecodeli-500 text-white">FR</button>
                    <button className="px-2 py-1 text-sm font-medium rounded text-ecodeli-700 dark:text-ecodeli-300">EN</button>
                  </div>
                </div>

                {/* Sélecteur de thème dans le menu mobile */}
                <div className="flex items-center justify-between">
                  <span className="text-ecodeli-700 dark:text-ecodeli-300">Changer de thème</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-ecodeli-100 dark:hover:bg-ecodeli-800"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5 text-amber-400" />
                    ) : (
                      <Moon className="h-5 w-5 text-ecodeli-600" />
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-ecodeli-500 text-ecodeli-700 dark:border-ecodeli-600 dark:text-ecodeli-300"
                  >
                    <Link href="/auth/signin">Connexion</Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-ecodeli-600 to-ecodeli-500 text-white dark:from-ecodeli-500 dark:to-ecodeli-600"
                  >
                    <Link href="/auth/signup">Inscription</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}