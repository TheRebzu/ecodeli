"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, MessageSquare, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ProfileButton } from "../shared/profile-button";
import { ModeToggle } from "../shared/mode-toggle";
import { Badge } from "../ui/badge";

interface HeaderProps {
  className?: string;
}

export function DashboardHeader({ className }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
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
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
} 