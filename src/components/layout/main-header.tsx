'use client';

import Link from 'next/link';
import { Bell, MessageSquare, Search, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface MainHeaderProps {
  locale?: string;
  title?: string;
  subtitle?: string;
  sidebarComponent?: React.ReactNode;
  showSearch?: boolean;
  showNotifications?: boolean;
  showMessages?: boolean;
  showUserMenu?: boolean;
  notificationCount?: number;
  messageCount?: number;
  className?: string;
  onSearch?: (searchTerm: string) => void;
  userMenuItems?: React.ReactNode;
  showLanguageSwitcher?: boolean;
  showModeToggle?: boolean;
  logoHref?: string;
}

export function MainHeader({
  locale = 'fr',
  title = 'EcoDeli',
  subtitle,
  sidebarComponent,
  showSearch = true,
  showNotifications = true,
  showMessages = true,
  showUserMenu = true,
  notificationCount = 0,
  messageCount = 0,
  className,
  onSearch,
  userMenuItems,
  showLanguageSwitcher = true,
  showModeToggle = true,
  logoHref = '/',
}: MainHeaderProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { logout } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  return (
    <header
      className={cn(
        'border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40',
        className
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo et menu mobile */}
        <div className="flex items-center gap-2 md:gap-4">
          {sidebarComponent && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="block md:hidden">
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0" onCloseAutoFocus={e => e.preventDefault()}>
                {sidebarComponent}
              </SheetContent>
            </Sheet>
          )}

          <Link href={logoHref} className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold">E</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none">{title}</span>
              {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
          </Link>
        </div>

        {/* Barre de recherche - version desktop */}
        {showSearch && (
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher..."
                className="w-full pl-9 bg-muted/40 border-muted"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
              />
            </div>
          </form>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showNotifications && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Notifications"
              className="relative"
              asChild
            >
              <Link href={`/${locale}/notifications`}>
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {showMessages && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Messages"
              className="relative"
              asChild
            >
              <Link href={`/${locale}/messages`}>
                <MessageSquare className="h-5 w-5" />
                {messageCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {messageCount > 9 ? '9+' : messageCount}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {showLanguageSwitcher && <LanguageSwitcher locale={locale} />}

          {showModeToggle && <ModeToggle />}

          {showUserMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userMenuItems || (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href={`/${locale}/profile`}>Profil</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/${locale}/settings`}>Paramètres</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>Déconnexion</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
