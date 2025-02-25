// src/components/layout/main-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 flex">
      <Link href="/" className="mr-6 flex items-center space-x-2">
        <span className="font-bold inline-block">EcoDeli</span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link
          href="/announcements"
          className={cn(
            "transition-colors hover:text-primary",
            pathname === "/announcements"
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          Annonces
        </Link>
        <Link
          href="/services"
          className={cn(
            "transition-colors hover:text-primary",
            pathname === "/services"
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          Services
        </Link>
        <Link
          href="/about"
          className={cn(
            "transition-colors hover:text-primary",
            pathname === "/about"
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          À propos
        </Link>
        <Link
          href="/contact"
          className={cn(
            "transition-colors hover:text-primary",
            pathname === "/contact"
              ? "text-foreground"
              : "text-foreground/60"
          )}
        >
          Contact
        </Link>
      </nav>
    </div>
  );
}