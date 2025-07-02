'use client'

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TutorialButton } from '@/features/tutorials/components/tutorial-button';
import { 
  Package, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  CreditCard,
  Truck,
  Calendar,
  Box,
  Menu,
  Search,
  Plus,
  BookOpen
} from 'lucide-react';

interface ClientHeaderProps {
  user: {
    id?: string;
    name?: string;
    email: string;
    avatar?: string;
    subscription?: 'FREE' | 'STARTER' | 'PREMIUM';
  };
  onLogout: () => void;
  onMenuToggle?: () => void;
  notificationCount?: number;
}

export function ClientHeader({ 
  user, 
  onLogout, 
  onMenuToggle,
  notificationCount 
}: ClientHeaderProps) {
  const t = useTranslations();

  const subscriptionColors = {
    FREE: 'bg-gray-100 text-gray-800',
    STARTER: 'bg-blue-100 text-blue-800',
    PREMIUM: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu toggle */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg hidden sm:inline">EcoDeli</span>
          </div>
        </div>

        {/* Search bar - hidden on mobile */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t('common.search', 'Rechercher...')}
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Quick action - New announcement */}
          <Button size="sm" className="hidden sm:flex" asChild>
            <Link href="/client/announcements/create">
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.newAnnouncement', 'Nouvelle Annonce')}
            </Link>
          </Button>

          {/* Tutorial access */}
          <div className="hidden md:block">
            <TutorialButton variant="ghost" size="sm" />
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notificationCount > 0 ? (
                <>
                  <DropdownMenuItem>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">Nouvelle livraison acceptée</p>
                      <p className="text-xs text-muted-foreground">Il y a 5 minutes</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">Service programmé demain</p>
                      <p className="text-xs text-muted-foreground">Il y a 1 heure</p>
                    </div>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem disabled>
                  <p className="text-sm text-muted-foreground">Aucune notification</p>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>
                    {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{user.name || 'Client'}</p>
                    <Badge 
                      variant="outline" 
                      className={subscriptionColors[user.subscription || 'FREE']}
                    >
                      {user.subscription || 'FREE'}
                    </Badge>
                  </div>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/client/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/client/subscription">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Abonnement</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/client/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="md:hidden">
                <BookOpen className="mr-2 h-4 w-4" />
                <TutorialButton variant="ghost" size="sm" className="p-0 h-auto" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Déconnexion</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}