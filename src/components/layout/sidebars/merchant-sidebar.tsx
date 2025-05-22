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
  FileText,
  Megaphone,
  Store,
  ClipboardCheck,
  BarChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useSession } from 'next-auth/react';

interface MerchantSidebarProps {
  locale: string;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export function MerchantSidebar({ locale }: MerchantSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: session } = useSession();

  // Récupérer les informations de l'utilisateur connecté
  const userName = session?.user?.name || 'Utilisateur';
  const userEmail = session?.user?.email || 'utilisateur@ecodeli.com';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
  const businessName = session?.user?.business?.name || 'Mon Commerce';

  const navigationItems: NavigationItem[] = [
    {
      label: 'Tableau de bord',
      href: `/${locale}/merchant`,
      icon: Home,
    },
    {
      label: 'Mon profil',
      href: `/${locale}/merchant/profile`,
      icon: User,
    },
    {
      label: 'Mon commerce',
      href: `/${locale}/merchant/store`,
      icon: Store,
    },
    {
      label: 'Contrat',
      href: `/${locale}/merchant/contract`,
      icon: ClipboardCheck,
    },
    {
      label: 'Livraisons',
      href: `/${locale}/merchant/deliveries`,
      icon: Package,
      badge: 3,
    },
    {
      label: 'Statistiques',
      href: `/${locale}/merchant/stats`,
      icon: BarChart,
    },
    {
      label: 'Factures',
      href: `/${locale}/merchant/invoices`,
      icon: FileText,
    },
    {
      label: 'Paiements',
      href: `/${locale}/merchant/payments`,
      icon: CreditCard,
    },
    {
      label: 'Messages',
      href: `/${locale}/merchant/messages`,
      icon: MessageSquare,
      badge: 1,
    },
    {
      label: 'Annonces',
      href: `/${locale}/merchant/announcements`,
      icon: Megaphone,
    },
  ];

  const handleLogout = () => {
    console.log('Déconnexion du commerçant');
    logout();
  };

  return (
    <nav className="h-full flex flex-col bg-background border-r">
      <div className="p-4 border-b flex justify-between items-center">
        <Link href={`/${locale}/merchant`} className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold">E</span>
          </div>
          <span className="font-bold">Commerçant</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              1
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

      {/* Statistique importante */}
      <div className="px-4 py-3 border-t border-b">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Livraisons du mois</span>
          <div className="flex items-end gap-2">
            <span className="text-lg font-bold">87</span>
            <span className="text-xs text-green-500 flex items-center">
              +12%
              <svg
                className="w-3 h-3 ml-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                ></path>
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* Action rapide */}
      <div className="p-4">
        <Button className="w-full" size="sm">
          <Package className="h-4 w-4 mr-2" />
          Programmer une livraison
        </Button>
      </div>

      <div className="mt-auto p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <span className="font-medium text-sm">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{businessName}</p>
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
