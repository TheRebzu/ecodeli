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
    title: "Services",
    href: "/services",
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
    title: "Contact",
    href: "/contact",
  },
]

export default function PublicHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center px-4 sm:px-8">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block h-8 w-8 bg-primary rounded-md"></span>
            <span className="hidden font-bold sm:inline-block">EcoDeli</span>
          </Link>
        </div>

        {/* Navigation desktop */}
        <nav className="hidden md:flex ml-8 space-x-6">
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
        <div className="ml-auto flex items-center space-x-3">
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2">
                <Globe className="h-4 w-4 mr-2" />
                FR
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Français</DropdownMenuItem>
              <DropdownMenuItem>English</DropdownMenuItem>
              <DropdownMenuItem>Español</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
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
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pr-0">
              <div className="px-7">
                <Link href="/" className="flex items-center space-x-2" onClick={() => setMobileNavOpen(false)}>
                  <span className="inline-block h-8 w-8 bg-primary rounded-md"></span>
                  <span className="font-bold">EcoDeli</span>
                </Link>
              </div>
              <nav className="flex flex-col gap-4 px-7 mt-10">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-base font-medium transition-colors hover:text-primary"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
                <div className="flex flex-col gap-2 mt-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/auth/login" onClick={() => setMobileNavOpen(false)}>
                      Se connecter
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
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