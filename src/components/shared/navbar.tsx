"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Menu,
  Package,
  ShoppingCart,
  User,
  X,
  Bike,
  Store,
  BookOpen,
  Settings,
  Heart,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { LogoutButton } from "@/components/shared/logout-button";

const mainNavItems = [
  { href: "/", label: "Accueil" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Tarifs" },
  { href: "/about", label: "À propos" },
];

type RoleNavItems = {
  [key: string]: {
    icon: React.ElementType;
    items: { href: string; label: string; icon: React.ElementType }[];
  };
};

const roleNavItems: RoleNavItems = {
  CLIENT: {
    icon: User,
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: BookOpen },
      { href: "/shipments", label: "Mes livraisons", icon: Package },
      { href: "/favorites", label: "Favoris", icon: Heart },
      { href: "/profile", label: "Mon profil", icon: User },
      { href: "/settings", label: "Paramètres", icon: Settings },
    ],
  },
  MERCHANT: {
    icon: Store,
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: BookOpen },
      { href: "/products", label: "Mes produits", icon: ShoppingCart },
      { href: "/orders", label: "Commandes", icon: Package },
      { href: "/profile", label: "Mon profil", icon: User },
      { href: "/settings", label: "Paramètres", icon: Settings },
    ],
  },
  COURIER: {
    icon: Bike,
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: BookOpen },
      { href: "/deliveries", label: "Mes livraisons", icon: Package },
      { href: "/earnings", label: "Mes gains", icon: ShoppingCart },
      { href: "/profile", label: "Mon profil", icon: User },
      { href: "/settings", label: "Paramètres", icon: Settings },
    ],
  },
  PROVIDER: {
    icon: Package,
    items: [
      { href: "/dashboard", label: "Tableau de bord", icon: BookOpen },
      { href: "/services", label: "Mes services", icon: ShoppingCart },
      { href: "/requests", label: "Demandes", icon: Package },
      { href: "/profile", label: "Mon profil", icon: User },
      { href: "/settings", label: "Paramètres", icon: Settings },
    ],
  },
};

type NavbarProps = {
  className?: string;
};

export function Navbar({ className }: NavbarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole = session?.user?.role || "CLIENT";
  const isAuthenticated = status === "authenticated";

  // Change navbar style on scroll
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navbarClasses = cn(
    "sticky top-0 w-full z-40 transition-all duration-200",
    scrolled
      ? "bg-white/95 backdrop-blur-md shadow-sm border-b"
      : "bg-white border-b",
    className
  );

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className={navbarClasses}>
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and brand */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl text-primary">EcoDeli</span>
          </Link>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === item.href
                  ? "text-primary bg-primary/10"
                  : "text-foreground/80 hover:text-primary hover:bg-primary/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth buttons and user profile */}
        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={session.user?.image || ""}
                      alt={session.user?.name || ""}
                    />
                    <AvatarFallback>
                      {getInitials(session.user?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {roleNavItems[userRole].items.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="cursor-pointer w-full">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <LogoutButton
                    variant="ghost"
                    className="cursor-pointer w-full flex items-center"
                    showIcon
                  >
                    <span>Déconnexion</span>
                  </LogoutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/login">Connexion</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Inscription</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="px-0 sm:max-w-sm">
                <div className="flex flex-col h-full">
                  <div className="p-6">
                    <Link
                      href="/"
                      className="flex items-center space-x-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Package className="h-6 w-6 text-primary" />
                      <span className="font-bold text-xl text-primary">
                        EcoDeli
                      </span>
                    </Link>
                    <SheetClose className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </SheetClose>
                  </div>
                  
                  <nav className="flex-1 px-6 space-y-4">
                    {/* Main navigation items */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground py-1">
                        Navigation
                      </p>
                      {mainNavItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center py-2 text-sm font-medium rounded-md transition-colors",
                            pathname === item.href
                              ? "text-primary"
                              : "text-foreground/70 hover:text-primary"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    {/* User items if authenticated */}
                    {isAuthenticated && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground py-1">
                          Votre espace
                        </p>
                        {roleNavItems[userRole].items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center py-2 text-sm font-medium text-foreground/70 hover:text-primary"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </nav>

                  {/* Auth buttons on mobile */}
                  <div className="p-6 border-t">
                    {isAuthenticated ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={session.user?.image || ""}
                              alt={session.user?.name || ""}
                            />
                            <AvatarFallback>
                              {getInitials(session.user?.name || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">
                              {session.user?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {session.user?.email}
                            </p>
                          </div>
                        </div>
                        <LogoutButton className="w-full" variant="outline" showIcon>
                          Déconnexion
                        </LogoutButton>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-2">
                        <Button asChild>
                          <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Connexion
                          </Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link
                            href="/register"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Inscription
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
} 