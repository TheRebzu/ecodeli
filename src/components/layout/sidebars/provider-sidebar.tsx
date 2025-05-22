'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  CreditCard,
  LogOut,
  Bell,
  MessageSquare,
  Home,
  User,
  Calendar,
  Briefcase,
  Star,
  ClipboardCheck,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useSession } from 'next-auth/react';

interface ProviderSidebarProps {
  locale: string;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export function ProviderSidebar({ locale }: ProviderSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { data: session } = useSession();

  // Récupérer les informations de l'utilisateur connecté
  const userName = session?.user?.name || 'Utilisateur';
  const userEmail = session?.user?.email || 'utilisateur@ecodeli.com';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
  const serviceType = session?.user?.provider?.serviceType || 'Prestataire de services';

  const navigationItems: NavigationItem[] = [
    {
      label: 'Tableau de bord',
      href: `/${locale}/provider`,
      icon: Home,
    },
    {
      label: 'Mon profil',
      href: `/${locale}/provider/profile`,
      icon: User,
    },
    {
      label: 'Mes services',
      href: `/${locale}/provider/services`,
      icon: Briefcase,
    },
    {
      label: 'Rendez-vous',
      href: `/${locale}/provider/appointments`,
      icon: Calendar,
      badge: 2,
    },
    {
      label: 'Planning',
      href: `/${locale}/provider/schedule`,
      icon: Calendar,
    },
    {
      label: 'Documents',
      href: `/${locale}/provider/documents`,
      icon: ClipboardCheck,
    },
    {
      label: 'Évaluations',
      href: `/${locale}/provider/ratings`,
      icon: Star,
    },
    {
      label: 'Factures',
      href: `/${locale}/provider/invoices`,
      icon: FileText,
    },
    {
      label: 'Paiements',
      href: `/${locale}/provider/payments`,
      icon: CreditCard,
    },
    {
      label: 'Messages',
      href: `/${locale}/provider/messages`,
      icon: MessageSquare,
      badge: 3,
    },
  ];

  const handleLogout = () => {
    console.log('Déconnexion du prestataire');
    logout();
  };

  return (
    <nav className="h-full flex flex-col bg-background border-r">
      <div className="p-4 border-b flex justify-between items-center">
        <Link href={`/${locale}/provider`} className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold">E</span>
          </div>
          <span className="font-bold">Prestataire</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
              5
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

      {/* Statistique */}
      <div className="px-4 py-3 border-t border-b">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Taux de satisfaction</span>
          <div className="flex items-end gap-1">
            <span className="text-lg font-bold">4.8/5</span>
            <div className="flex text-yellow-400">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={cn('h-3 w-3', star === 5 ? 'text-yellow-300/50' : '')}
                  fill={star < 5 ? 'currentColor' : 'none'}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action rapide */}
      <div className="p-4">
        <Button className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un service
        </Button>
      </div>

      <div className="mt-auto p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            <span className="font-medium text-sm">{userInitials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{serviceType}</p>
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
