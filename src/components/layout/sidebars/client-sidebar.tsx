'use client';

import {
  Package,
  CreditCard,
  Bell,
  MessageSquare,
  Home,
  User,
  ShoppingBag,
  FileText,
  Megaphone,
  Box,
  Calendar,
  Cog,
} from 'lucide-react';
import { BaseSidebar, SidebarSection } from './base-sidebar';
import { useAuth } from '@/hooks/use-auth';

interface ClientSidebarProps {
  locale: string;
  notificationCount?: number;
  messageCount?: number;
  userData?: {
    name: string;
    email: string;
    avatar?: string;
  };
  collapsed?: boolean;
}

export function ClientSidebar({
  locale,
  notificationCount = 2,
  messageCount = 3,
  userData = {
    name: 'Sophie Lavoie',
    email: 'sophie.lavoie@gmail.com',
  },
  collapsed = false,
}: ClientSidebarProps) {
  const { user } = useAuth();

  // Utilisons les données réelles de l'utilisateur si disponibles
  const userInfo = user
    ? {
        name: user.name || userData.name,
        email: user.email || userData.email,
        avatar: user.image || userData.avatar,
      }
    : userData;

  const sections: SidebarSection[] = [
    {
      title: 'Principal',
      items: [
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
      ],
    },
    {
      title: 'Services',
      items: [
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
      ],
    },
    {
      title: 'Finance',
      items: [
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
      ],
    },
    {
      title: 'Communication',
      items: [
        {
          label: 'Messages',
          href: `/${locale}/client/messages`,
          icon: MessageSquare,
          badge: messageCount,
        },
        {
          label: 'Notifications',
          href: `/${locale}/client/notifications`,
          icon: Bell,
          badge: notificationCount,
        },
        {
          label: 'Annonces',
          href: `/${locale}/client/announcements`,
          icon: Megaphone,
        },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        {
          label: 'Préférences',
          href: `/${locale}/client/settings`,
          icon: Cog,
        },
      ],
    },
  ];

  return (
    <BaseSidebar
      locale={locale}
      sections={sections}
      title="Espace Client"
      userInfo={userInfo}
      notifications={notificationCount}
      defaultCollapsed={collapsed}
      collapsible={true}
      subscriptionInfo={{
        plan: 'Plan Essentiel',
        href: `/${locale}/client/subscription`,
      }}
      quickAction={{
        label: 'Nouvelle livraison',
        icon: Package,
        href: `/${locale}/client/deliveries/new`,
      }}
    />
  );
}
