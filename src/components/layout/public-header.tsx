'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, ChevronRight, ShoppingBag, Users, Phone, Leaf } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface PublicHeaderProps {
  locale: string;
}

export function PublicHeader({ locale }: PublicHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Determine scroll direction
      if (currentScrollY > lastScrollY) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }

      // Determine if we've scrolled past the threshold
      if (currentScrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={cn(
        'sticky w-full transition-all duration-300 z-50',
        scrolled
          ? 'border-b bg-background/95 backdrop-blur-md shadow-sm supports-[backdrop-filter]:bg-background/80'
          : 'bg-background/50 backdrop-blur-sm supports-[backdrop-filter]:bg-background/30',
        {
          'top-0':
            scrollDirection === 'up' ||
            (scrollDirection === 'down' && scrolled && lastScrollY <= 200),
          '-top-20': scrollDirection === 'down' && scrolled && lastScrollY > 200,
        }
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link
          href={`/${locale}/home`}
          className="flex items-center space-x-2 transition-transform hover:scale-105"
        >
          <div className="h-9 w-9 bg-primary rounded-full flex items-center justify-center shadow-md relative overflow-hidden group">
            <span className="text-primary-foreground font-bold text-lg absolute z-10">E</span>
            <span className="absolute inset-0 bg-primary-foreground/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full"></span>
          </div>
          <span className="font-bold text-xl">EcoDeli</span>
          <div className="hidden md:flex items-center ml-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full">
            <Leaf className="h-3 w-3 mr-1" />
            <span>Éco-responsable</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link href={`/${locale}/home`} className={navigationMenuTriggerStyle()}>
                  Accueil
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Services</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] animate-in fade-in-50 zoom-in-95 duration-300">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <Link
                        className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-primary/50 to-primary p-6 no-underline outline-none focus:shadow-md group relative overflow-hidden"
                        href={`/${locale}/services`}
                      >
                        <div className="absolute inset-0 bg-primary-foreground/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <ShoppingBag className="h-6 w-6 text-white transition-transform group-hover:scale-110 duration-300 relative z-10" />
                        <div className="mb-2 mt-4 text-lg font-medium text-white relative z-10">
                          Tous nos services
                        </div>
                        <p className="text-sm leading-tight text-white/90 relative z-10">
                          Découvrez notre gamme complète de services de livraison écologique
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                        href={`/${locale}/shipping`}
                      >
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary transition-all group-hover:h-2 group-hover:w-2"></span>
                          Livraison
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Livraison rapide et écologique pour vos colis
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                        href={`/${locale}/pricing`}
                      >
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary transition-all group-hover:h-2 group-hover:w-2"></span>
                          Tarifs
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Des tarifs compétitifs et transparents
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                        href={`/${locale}/become-delivery`}
                      >
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary transition-all group-hover:h-2 group-hover:w-2"></span>
                          Devenir livreur
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Rejoignez notre équipe de livreurs écologiques
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>À propos</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 animate-in fade-in-50 zoom-in-95 duration-300">
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                        href={`/${locale}/about`}
                      >
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary transition-all group-hover:h-2 group-hover:w-2"></span>
                          Notre entreprise
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Découvrez notre mission et nos valeurs écologiques
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                        href={`/${locale}/contact`}
                      >
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary transition-all group-hover:h-2 group-hover:w-2"></span>
                          Contact
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Contactez notre équipe pour en savoir plus
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <Link
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground group"
                        href={`/${locale}/faq`}
                      >
                        <div className="text-sm font-medium leading-none flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary transition-all group-hover:h-2 group-hover:w-2"></span>
                          FAQ
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Réponses aux questions fréquemment posées
                        </p>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="tel:+33123456789"
            className="text-sm text-muted-foreground hover:text-primary transition-colors hidden lg:flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            <span>+33 1 23 45 67 89</span>
          </a>
          <div className="flex items-center gap-2 border-l border-r px-4">
            <LanguageSwitcher locale={locale} />
            <ModeToggle />
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/login`}>
              <Button
                variant="ghost"
                size="sm"
                className="transition-colors hover:text-primary relative overflow-hidden group"
              >
                <span className="relative z-10">Connexion</span>
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
              </Button>
            </Link>
            <Link href={`/${locale}/register`} className="group">
              <span
                className={cn(
                  buttonVariants({ size: 'sm' }),
                  'relative overflow-hidden transition-all duration-300'
                )}
              >
                <span className="relative z-10">Inscription</span>
                <span className="absolute inset-0 bg-primary-foreground/10 translate-y-[101%] group-hover:translate-y-0 transition-transform duration-300 rounded-md"></span>
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher locale={locale} />
          <ModeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu" className="relative">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-[350px] p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between py-4 px-6 border-b">
                  <Link
                    href={`/${locale}/home`}
                    className="flex items-center space-x-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-bold">E</span>
                    </div>
                    <span className="font-bold text-xl">EcoDeli</span>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex flex-col my-6 px-4 space-y-6 overflow-auto">
                  <Link
                    href={`/${locale}/home`}
                    className="py-2 px-3 flex items-center justify-between rounded-md hover:bg-muted transition-colors border-l-2 border-transparent hover:border-primary"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="font-medium">Accueil</span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Link>

                  <div className="py-2 px-3 space-y-3">
                    <div className="flex items-center text-sm font-medium">
                      <ShoppingBag className="h-4 w-4 mr-2 text-primary" />
                      Services
                    </div>
                    <div className="pl-6 space-y-3 border-l border-muted">
                      <Link
                        href={`/${locale}/services`}
                        className="block py-2 px-3 rounded-md hover:bg-muted transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="font-medium">Tous nos services</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Notre gamme complète de services
                        </p>
                      </Link>
                      <Link
                        href={`/${locale}/shipping`}
                        className="block py-2 px-3 rounded-md hover:bg-muted transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="font-medium">Livraison</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Livraison écologique pour vos colis
                        </p>
                      </Link>
                      <Link
                        href={`/${locale}/pricing`}
                        className="block py-2 px-3 rounded-md hover:bg-muted transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="font-medium">Tarifs</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tarifs compétitifs et transparents
                        </p>
                      </Link>
                      <Link
                        href={`/${locale}/become-delivery`}
                        className="block py-2 px-3 rounded-md hover:bg-muted transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="font-medium">Devenir livreur</span>
                        <p className="text-xs text-muted-foreground mt-1">Rejoignez notre équipe</p>
                      </Link>
                    </div>
                  </div>

                  <div className="py-2 px-3 space-y-3">
                    <div className="flex items-center text-sm font-medium">
                      <Users className="h-4 w-4 mr-2 text-primary" />À propos
                    </div>
                    <div className="pl-6 space-y-3 border-l border-muted">
                      <Link
                        href={`/${locale}/about`}
                        className="block py-2 px-3 rounded-md hover:bg-muted transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="font-medium">Notre entreprise</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Mission et valeurs écologiques
                        </p>
                      </Link>
                      <Link
                        href={`/${locale}/contact`}
                        className="block py-2 px-3 rounded-md hover:bg-muted transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="font-medium">Contact</span>
                        <p className="text-xs text-muted-foreground mt-1">Contactez notre équipe</p>
                      </Link>
                      <Link
                        href={`/${locale}/faq`}
                        className="block py-2 px-3 rounded-md hover:bg-muted transition-colors"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="font-medium">FAQ</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Questions fréquemment posées
                        </p>
                      </Link>
                    </div>
                  </div>
                </nav>
                <div className="mt-auto p-6 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/${locale}/login`}
                      className="w-full"
                      onClick={() => setIsOpen(false)}
                    >
                      <Button variant="outline" className="w-full">
                        Connexion
                      </Button>
                    </Link>
                    <Link
                      href={`/${locale}/register`}
                      className="w-full"
                      onClick={() => setIsOpen(false)}
                    >
                      <Button className="w-full">Inscription</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
