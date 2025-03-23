"use client";

import React from "react";
import Link from "next/link";
<<<<<<< HEAD
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, MessageSquare, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
=======
import { ModeToggle } from "@/components/shared/mode-toggle";
import { ProfileButton } from "@/components/shared/profile-button";
import { Icons } from "@/components/shared/icons";
>>>>>>> 5b14b134948ec7b19d55a9a8fff5829e7f796b19
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types
interface NavLink {
  label: string;
  href: string;
  active?: boolean;
  badge?: boolean;
}

export function DashboardHeader() {
  // Définir des liens de navigation statiques
  const links: NavLink[] = [
    {
      label: "Tableau de bord",
      href: "/dashboard",
      active: true,
    },
    {
      label: "Livraisons",
      href: "/dashboard/shipments",
    },
    {
      label: "Paiements",
      href: "/dashboard/payments",
    },
    {
      label: "Messages",
      href: "/dashboard/messages",
    },
    {
      label: "Admin",
      href: "/admin",
      badge: true,
    },
  ];

  return (
<<<<<<< HEAD
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm transition-all", className)}>
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/dashboard" className="flex items-center space-x-2 shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">EcoDeli</span>
              <Badge variant="outline" className="hidden md:flex">Dashboard</Badge>
            </Link>

            <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
              <Link
                href="/dashboard"
                className={cn(
                  "px-2 lg:px-3 py-1.5 lg:py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                  pathname === "/dashboard" ? "text-foreground font-medium" : "text-foreground/60"
                )}
              >
                Tableau de bord
              </Link>
              <Link
                href="/dashboard/deliveries"
                className={cn(
                  "px-2 lg:px-3 py-1.5 lg:py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                  pathname?.startsWith("/dashboard/deliveries") ? "text-foreground font-medium" : "text-foreground/60"
                )}
              >
                Livraisons
              </Link>
              <Link
                href="/dashboard/messages"
                className={cn(
                  "px-2 lg:px-3 py-1.5 lg:py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                  pathname?.startsWith("/dashboard/messages") ? "text-foreground font-medium" : "text-foreground/60"
                )}
              >
                Messages
              </Link>
              <Link
                href="/dashboard/profile"
                className={cn(
                  "px-2 lg:px-3 py-1.5 lg:py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                  pathname?.startsWith("/dashboard/profile") ? "text-foreground font-medium" : "text-foreground/60"
                )}
              >
                Profil
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-primary text-[9px] sm:text-[10px] font-medium text-primary-foreground flex items-center justify-center">3</span>
            </Button>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9" onClick={() => router.push('/dashboard/messages')}>
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-primary text-[9px] sm:text-[10px] font-medium text-primary-foreground flex items-center justify-center">2</span>
            </Button>
            <ModeToggle />
            <div className="hidden md:flex items-center pl-1 sm:pl-2">
              <ProfileButton />
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-muted">
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(300px,calc(100vw-1rem))]">
              <div className="grid gap-4 py-4">
                <Link 
                  href="/dashboard"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname === "/dashboard" ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  Tableau de bord
                </Link>
                <Link 
                  href="/dashboard/deliveries"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname?.startsWith("/dashboard/deliveries") ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  Livraisons
                </Link>
                <Link 
                  href="/dashboard/messages"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname?.startsWith("/dashboard/messages") ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  Messages
                </Link>
                <Link 
                  href="/dashboard/profile"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname?.startsWith("/dashboard/profile") ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  Profil
                </Link>
                <div className="flex justify-between mt-4 pt-4 border-t">
                  <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">3</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MessageSquare className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">2</span>
                  </Button>
                  <ModeToggle />
                  <ProfileButton />
                </div>
=======
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/dashboard" className="flex items-center gap-1">
            <Icons.package className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">
              EcoDelivery
            </span>
          </Link>
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Services</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <a
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          href="#"
                        >
                          <Icons.check className="h-6 w-6 text-primary" />
                          <div className="mb-2 mt-4 text-lg font-medium">
                            Service Premium
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground">
                            Bénéficiez de livraisons prioritaires et d&apos;un support dédié 24/7
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <ListItem href="#" title="Livraison express">
                      Livraison le jour même dans votre ville
                    </ListItem>
                    <ListItem href="#" title="Stockage temporaire">
                      Gestion d&apos;entrepôt et stockage sécurisé
                    </ListItem>
                    <ListItem href="#" title="Emballage écologique">
                      Emballages biodégradables et réutilisables
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Ressources</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    <ListItem href="#" title="Guide d'utilisation">
                      Comment utiliser notre plateforme efficacement
                    </ListItem>
                    <ListItem href="#" title="FAQ">
                      Réponses aux questions fréquemment posées
                    </ListItem>
                    <ListItem href="#" title="Blog">
                      Articles et actualités sur la logistique durable
                    </ListItem>
                    <ListItem href="#" title="Partenaires">
                      Nos partenaires pour une chaîne logistique verte
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="#" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Aide
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        {/* Navigation mobile */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Icons.menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
        
        {/* Navigation principale */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground/80",
                link.active ? "text-foreground" : "text-foreground/60"
              )}
            >
              <div className="flex items-center gap-1">
                {link.label}
                {link.badge && (
                  <Badge variant="default" className="ml-1">Admin</Badge>
                )}
>>>>>>> 5b14b134948ec7b19d55a9a8fff5829e7f796b19
              </div>
            </Link>
          ))}
        </nav>
        
        <div className="flex items-center gap-2">
          <ModeToggle />
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { 
    title: string 
  }
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
}); 