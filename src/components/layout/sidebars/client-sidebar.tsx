'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  CreditCard,
  LogOut,
  Bell,
  MessageSquare,
  Home,
  User,
  ShoppingBag,
  FileText,
  Megaphone,
  Box,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';

interface ClientSidebarProps {
  locale: string;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export function ClientSidebar({ locale }: ClientSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navigationItems: NavigationItem[] = [
    {
      label: 'Tableau de bord',
      href: `/${locale}/client`,
      icon: Home,
    },
    {
      label: 'Mon profil',
      href: `/${locale}/client/profile`,
      icon: User,
    },
    {
      label: 'Services',
      href: `/${locale}/client/services`,
      icon: ShoppingBag,
    },
    {
      label: 'Livraisons',
      href: `/${locale}/client/deliveries`,
      icon: Package,
      badge: 1,
    },
    {
      label: 'Stockage',
      href: `/${locale}/client/storage`,
      icon: Box,
    },
    {
      label: 'Rendez-vous',
      href: `/${locale}/client/appointments`,
      icon: Calendar,
    },
    {
      label: 'Factures',
      href: `/${locale}/client/invoices`,
      icon: FileText,
    },
    {
      label: 'Paiements',
      href: `/${locale}/client/payments`,
      icon: CreditCard,
    },
    {
      label: 'Messages',
      href: `/${locale}/client/messages`,
      icon: MessageSquare,
      badge: 2,
    },
    {
      label: 'Annonces',
      href: `/${locale}/client/announcements`,
      icon: Megaphone,
    },
  ];

  const handleLogout = () => {
    console.log('Déconnexion du client');
    logout();
  };

  return (
    <nav className="h-full flex flex-col bg-background border-r">
      <div className="p-4 border-b flex justify-between items-center">
        <Link href={`/${locale}/client`} className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold">E</span>
          </div>
          <span className="font-bold">Client</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              2
            </span>
          </Button>
        </div>
      </div>

      <div className="py-4 flex-1 overflow-auto">
        <div className="space-y-1 px-3">
          {navigationItems.map((item, index) => (
            <Link key={index} href={item.href} passHref>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start px-3 py-2',
                  pathname === item.href && 'bg-muted font-medium'
                )}
              >
                <item.icon className="h-4 w-4 mr-3" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Abonnement */}
      <div className="px-4 py-3 border-t border-b">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Abonnement</span>
            <div className="text-xs text-muted-foreground mt-1">Plan Essentiel</div>
          </div>
          <Link href={`/${locale}/client/subscription`}>
            <Button variant="outline" size="sm" className="text-xs h-7 px-2">
              Gérer
            </Button>
          </Link>
        </div>
      </div>

      {/* Action rapide */}
      <div className="p-4">
        <Button className="w-full" size="sm">
          <Package className="h-4 w-4 mr-2" />
          Nouvelle livraison
        </Button>
      </div>

      <div className="mt-auto p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <span className="font-medium text-sm">SL</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Sophie Lavoie</p>
            <p className="text-xs text-muted-foreground truncate">sophie.lavoie@gmail.com</p>
          </div>
        </div>
        <Separator className="my-4" />
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </nav>
  );
}
