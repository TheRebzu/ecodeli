"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProfileButton } from "./profile-button";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm transition-all", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">EcoDeli</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
            <Link
              href="/"
              className={cn(
                "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                pathname === "/" ? "text-foreground font-medium" : "text-foreground/60"
              )}
            >
              Accueil
            </Link>
            <Link
              href="/services"
              className={cn(
                "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                pathname?.startsWith("/services") ? "text-foreground font-medium" : "text-foreground/60"
              )}
            >
              Services
            </Link>
            <Link
              href="/about"
              className={cn(
                "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                pathname?.startsWith("/about") ? "text-foreground font-medium" : "text-foreground/60"
              )}
            >
              À propos
            </Link>
            <Link
              href="/pricing"
              className={cn(
                "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                pathname?.startsWith("/pricing") ? "text-foreground font-medium" : "text-foreground/60"
              )}
            >
              Tarifs
            </Link>
            <Link
              href="/contact"
              className={cn(
                "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                pathname?.startsWith("/contact") ? "text-foreground font-medium" : "text-foreground/60"
              )}
            >
              Contact
            </Link>
          </nav>

          <div className="hidden md:flex items-center pl-4">
            <ProfileButton />
          </div>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-muted">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(300px,calc(100vw-2rem))]">
              <div className="grid gap-6 py-6">
                <Link 
                  href="/"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname === "/" ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  Accueil
                </Link>
                <Link 
                  href="/services"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname?.startsWith("/services") ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  Services
                </Link>
                <Link 
                  href="/about"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname?.startsWith("/about") ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  À propos
                </Link>
                <Link 
                  href="/pricing"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname?.startsWith("/pricing") ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  Tarifs
                </Link>
                <Link 
                  href="/contact"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm font-medium transition-colors hover:bg-muted",
                    pathname?.startsWith("/contact") ? "text-foreground bg-muted/50" : "text-foreground/60"
                  )}
                >
                  Contact
                </Link>
                <div className="pt-6 border-t">
                  <ProfileButton />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
