'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  CreditCard,
  Calendar,
  LogOut,
  Megaphone,
  Bell,
  FileCheck,
  Map,
  Truck,
  MessageSquare,
  Home,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useSession } from 'next-auth/react';

interface DelivererSidebarProps {
  locale: string;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export function DelivererSidebar({ locale }: DelivererSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: session } = useSession();

  // Récupérer les informations de l'utilisateur connecté
  const userName = session?.user?.name || 'Utilisateur';
  const userEmail = session?.user?.email || 'utilisateur@ecodeli.com';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const navigationItems: NavigationItem[] = [
    {
      label: 'Tableau de bord',
      href: `/${locale}/deliverer`,
      icon: Home,
    },
    {
      label: 'Mon profil',
      href: `/${locale}/deliverer/profile`,
      icon: User,
    },
    {
      label: 'Livraisons actives',
      href: `/${locale}/deliverer/deliveries/active`,
      icon: Truck,
      badge: 2,
    },
    {
      label: 'Toutes les livraisons',
      href: `/${locale}/deliverer/deliveries`,
      icon: Package,
    },
    {
      label: 'Mes trajets',
      href: `/${locale}/deliverer/my-routes`,
      icon: Map,
    },
    {
      label: 'Planning',
      href: `/${locale}/deliverer/schedule`,
      icon: Calendar,
    },
    {
      label: 'Documents',
      href: `/${locale}/deliverer/documents`,
      icon: FileCheck,
    },
    {
      label: 'Paiements',
      href: `/${locale}/deliverer/payments`,
      icon: CreditCard,
    },
    {
      label: 'Messages',
      href: `/${locale}/deliverer/messages`,
      icon: MessageSquare,
      badge: 3,
    },
    {
      label: 'Annonces',
      href: `/${locale}/deliverer/announcements`,
      icon: Megaphone,
      badge: 1,
    },
  ];

  const handleLogout = () => {
    console.log('Déconnexion du livreur');
    logout();
  };

  return (
    <nav className="h-full flex flex-col bg-background border-r">
      <div className="p-4 border-b flex justify-between items-center">
        <Link href={`/${locale}/deliverer`} className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold">E</span>
          </div>
          <span className="font-bold">Livreur</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-4 w-4" />
            {/* Badge notifications */}
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              3
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

      {/* Statut de disponibilité */}
      <div className="px-4 py-3 border-t border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Statut</span>
            <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Disponible
            </span>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7 px-2">
            Changer
          </Button>
        </div>
      </div>

      {/* Action rapide */}
      <div className="p-4">
        <Button className="w-full" size="sm">
          <Truck className="h-4 w-4 mr-2" />
          Nouvelle livraison
        </Button>
      </div>

      <div className="mt-auto p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <span className="font-medium text-sm">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
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
