'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Menu,
  User,
  Search,
  Settings,
  LogOut,
  Languages,
  SunMoon,
  ChevronDown,
  FileQuestion,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { AdminSidebar } from './sidebars/admin-sidebar';
import { ClientSidebar } from './sidebars/client-sidebar';
import { DelivererSidebar } from './sidebars/deliverer-sidebar';
import { MerchantSidebar } from './sidebars/merchant-sidebar';
import { ProviderSidebar } from './sidebars/provider-sidebar';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface ProtectedHeaderProps {
  locale?: string;
}

export function ProtectedHeader({ locale = 'fr' }: ProtectedHeaderProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const pathname = usePathname();

  // Détermine le rôle actuel à partir du pathname
  const getRoleFromPath = () => {
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/client')) return 'client';
    if (pathname.includes('/deliverer')) return 'deliverer';
    if (pathname.includes('/merchant')) return 'merchant';
    if (pathname.includes('/provider')) return 'provider';
    return 'admin';
  };

  const role = getRoleFromPath();

  // Obtient le composant de sidebar approprié en fonction du rôle
  const getSidebarComponent = () => {
    switch (role) {
      case 'admin':
        return <AdminSidebar locale={locale} />;
      case 'client':
        return <ClientSidebar locale={locale} />;
      case 'deliverer':
        return <DelivererSidebar locale={locale} />;
      case 'merchant':
        return <MerchantSidebar locale={locale} />;
      case 'provider':
        return <ProviderSidebar locale={locale} />;
      default:
        return <AdminSidebar locale={locale} />;
    }
  };

  // Traduit le nom du rôle
  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'Administration';
      case 'client':
        return 'Espace Client';
      case 'deliverer':
        return 'Espace Livreur';
      case 'merchant':
        return 'Espace Commerçant';
      case 'provider':
        return 'Espace Prestataire';
      default:
        return 'Espace Personnel';
    }
  };

  // Pour la démo, simulons des notifications
  const notifications = [
    { id: 1, title: 'Nouvelle vérification', message: 'Demande de vérification en attente' },
    { id: 2, title: 'Nouveau message', message: 'Vous avez un nouveau message' },
    { id: 3, title: 'Paiement reçu', message: 'Un paiement a été effectué' },
    { id: 4, title: 'Alerte système', message: 'Une mise à jour système est disponible' },
  ];

  // Fonction de recherche à connecter au système de recherche global
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Recherche:', searchValue);
    // Implémenter la logique de recherche
  };

  const handleLogout = () => {
    console.log('Déconnexion');
    // Implémenter la logique de déconnexion
  };

  return (
    <TooltipProvider delayDuration={300}>
      <header className="border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo et navigation mobile */}
          <div className="flex items-center gap-2 md:gap-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="block md:hidden">
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0" onCloseAutoFocus={e => e.preventDefault()}>
                {getSidebarComponent()}
              </SheetContent>
            </Sheet>

            <Link href={`/${locale}/${role}`} className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold">E</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">EcoDeli</span>
                <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
              </div>
            </Link>

            {role === 'admin' && (
              <Badge
                variant="outline"
                className="hidden md:flex items-center gap-1 ml-2 py-1 border-orange-400/30 text-orange-500 bg-orange-50 dark:bg-orange-900/20"
              >
                <Shield className="h-3 w-3 mr-1" />
                <span className="text-xs">Super Admin</span>
              </Badge>
            )}
          </div>

          {/* Barre de recherche - version desktop */}
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

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Notifications"
                        className="relative"
                      >
                        <Bell className="h-5 w-5" />
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                          {notifications.length}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Notifications</span>
                        <Link
                          href={`/${locale}/${role}/notifications`}
                          className="text-xs text-primary hover:underline"
                        >
                          Voir toutes
                        </Link>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {notifications.map(notification => (
                        <DropdownMenuItem key={notification.id} className="p-3 cursor-pointer">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm">{notification.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {notification.message}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Notifications</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitcher locale={locale} />
              <ModeToggle />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 pl-2 pr-1 md:pl-3 md:pr-2 h-9"
                    >
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="hidden md:inline ml-1 text-sm font-normal">Admin</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profil</span>
                        <DropdownMenuShortcut>⇧P</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Paramètres</span>
                        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="md:hidden">
                        <Languages className="mr-2 h-4 w-4" />
                        <span>Langue</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="md:hidden">
                        <SunMoon className="mr-2 h-4 w-4" />
                        <span>Thème</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <FileQuestion className="mr-2 h-4 w-4" />
                      <span>Support technique</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Déconnexion</span>
                      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mon compte</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Barre de recherche - version mobile */}
        <form onSubmit={handleSearch} className="md:hidden container mx-auto px-4 pb-3">
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
      </header>
    </TooltipProvider>
  );
}
