'use client'

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/layout/providers/layout-provider"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  variant?: "icon-only" | "with-text" | "minimal"
  className?: string
}

export function ThemeToggle({ variant = "icon-only", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  if (variant === "minimal") {
    return (
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className={cn(
          "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
          className
        )}
        aria-label="Basculer le thème"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={variant === "with-text" ? "default" : "icon"} 
          className={cn("relative", className)}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          {variant === "with-text" && (
            <span className="ml-2">
              {theme === "light" ? "Clair" : theme === "dark" ? "Sombre" : "Système"}
            </span>
          )}
          <span className="sr-only">Basculer le thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="cursor-pointer"
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Clair</span>
          {theme === "light" && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="cursor-pointer"
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Sombre</span>
          {theme === "dark" && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="cursor-pointer"
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Système</span>
          {theme === "system" && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Version compacte pour mobile
 */
export function MobileThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, isDark } = useTheme()
  
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center space-x-2 w-full px-4 py-3 text-left",
        "hover:bg-muted transition-colors rounded-lg",
        className
      )}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 text-slate-700" />
      )}
      <span className="font-medium">
        {isDark ? 'Mode clair' : 'Mode sombre'}
      </span>
    </button>
  )
}

/**
 * Indicateur de thème système
 */
export function SystemThemeIndicator() {
  const { theme, isSystem } = useTheme()
  
  if (!isSystem) return null
  
  return (
    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
      <Monitor className="h-3 w-3" />
      <span>Auto</span>
    </div>
  )
} 