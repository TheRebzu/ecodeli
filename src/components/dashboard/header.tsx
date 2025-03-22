"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, MessageSquare } from "lucide-react";

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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center space-x-2 shrink-0">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">EcoDeli</span>
              <Badge variant="outline" className="hidden md:flex">Dashboard</Badge>
            </Link>

            <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
              <Link
                href="/dashboard"
                className={cn(
                  "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                  pathname === "/dashboard" ? "text-foreground font-medium" : "text-foreground/60"
                )}
              >
                Tableau de bord
              </Link>
              <Link
                href="/dashboard/deliveries"
                className={cn(
                  "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                  pathname?.startsWith("/dashboard/deliveries") ? "text-foreground font-medium" : "text-foreground/60"
                )}
              >
                Livraisons
              </Link>
              <Link
                href="/dashboard/messages"
                className={cn(
                  "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                  pathname?.startsWith("/dashboard/messages") ? "text-foreground font-medium" : "text-foreground/60"
                )}
              >
                Messages
              </Link>
              <Link
                href="/dashboard/profile"
                className={cn(
                  "px-3 py-2 rounded-md transition-colors hover:bg-muted hover:text-foreground/90",
                  pathname?.startsWith("/dashboard/profile") ? "text-foreground font-medium" : "text-foreground/60"
                )}
              >
                Profil
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">3</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/messages')}>
              <MessageSquare className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">2</span>
            </Button>
            <ModeToggle />
            <div className="hidden md:flex items-center pl-2">
              <ProfileButton />
            </div>
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
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">3</span>
                  </Button>
                  <Button variant="ghost" size="icon">
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