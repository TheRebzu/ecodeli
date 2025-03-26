"use client";

import React from "react";
import Link from "next/link";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { ProfileButton } from "@/components/shared/profile-button";
import { Icons } from "@/components/shared/icons";
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
                <Link href="/dashboard" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    Dashboard
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full md:h-9 md:w-9"
            aria-label="Notifications"
          >
            <Icons.bell className="h-4 w-4 md:h-5 md:w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground md:h-5 md:w-5">
              5
            </span>
          </Button>
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

ListItem.displayName = "ListItem"; 