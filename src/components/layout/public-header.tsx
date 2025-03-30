"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, Globe, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"

type NavItem = {
  title: string
  href: string
  description?: string
}

const mainNavItems: NavItem[] = [
  {
    title: "Accueil",
    href: "/",
  },
  {
    title: "Nos Services",
    href: "/services",
  },
  {
    title: "Expédier",
    href: "/shipping",
  },
  {
    title: "Devenir Livreur",
    href: "/become-delivery",
  },
  {
    title: "Tarifs",
    href: "/pricing",
  },
  {
    title: "À propos",
    href: "/about",
  },
  {
    title: "FAQ",
    href: "/faq",
  },
]

export default function PublicHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-4 md:px-8">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block h-7 w-7 sm:h-8 sm:w-8 bg-primary rounded-md"></span>
            <span className="font-bold text-base sm:text-lg">EcoDeli</span>
          </Link>
        </div>

        {/* Navigation desktop */}
        <nav className="hidden md:flex ml-8 space-x-4 lg:space-x-6">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        {/* Boutons d'authentification et sélecteur de langue */}
        <div className="ml-auto flex items-center space-x-1 sm:space-x-2 md:space-x-3">
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-1 sm:px-2 hidden sm:flex">
                <Globe className="h-4 w-4 mr-1 sm:mr-2" />
                FR
                <ChevronDown className="h-4 w-4 ml-0 sm:ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Français</DropdownMenuItem>
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem>Español</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auth Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="outline" size="sm">
                Connexion
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">
                Inscription
              </Button>
            </Link>
          </div>

          {/* Navigation mobile */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 sm:h-9 sm:w-9">
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pr-0 w-[85vw] sm:max-w-xs">
              <div className="px-5 sm:px-7">
                <Link href="/" className="flex items-center space-x-2" onClick={() => setMobileNavOpen(false)}>
                  <span className="inline-block h-7 w-7 sm:h-8 sm:w-8 bg-primary rounded-md"></span>
                  <span className="font-bold">EcoDeli</span>
                </Link>
              </div>
              <nav className="flex flex-col gap-3 sm:gap-4 px-5 sm:px-7 mt-8 sm:mt-10">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-sm sm:text-base font-medium transition-colors hover:text-primary"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 mt-3 sm:mt-4">
                  <div className="flex items-center gap-2 mt-1 sm:mt-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Langue: Français</span>
                  </div>
                  <Button variant="outline" size="sm" asChild className="mt-4 text-xs sm:text-sm h-8 sm:h-auto">
                    <Link href="/auth/login" onClick={() => setMobileNavOpen(false)}>
                      Se connecter
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="text-xs sm:text-sm h-8 sm:h-auto">
                    <Link href="/auth/register" onClick={() => setMobileNavOpen(false)}>
                      S&apos;inscrire
                    </Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}