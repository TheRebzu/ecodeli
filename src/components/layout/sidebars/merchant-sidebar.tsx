'use client';

import { useState } from 'react';
import {
  Home,
  Building,
  Megaphone,
  ShoppingBag,
  Package,
  FileText,
  CreditCard,
  MessageSquare,
  Bell,
  User,
  BarChart3,
  Receipt,
  TrendingUp,
  Users,
  Calendar,
  Settings,
  Shield,
  CheckCircle,
  Clock,
  Archive,
  Plus,
  Edit,
  Eye,
  MapPin,
  Star,
  DollarSign,
  Activity,
  Target,
  Briefcase,
  Globe,
  Layers,
} from 'lucide-react';
import { BaseSidebar, type SidebarSection } from '@/components/layout/sidebars/base-sidebar';

interface MerchantSidebarProps {
  locale: string;
}

export function MerchantSidebar({ locale }: MerchantSidebarProps) {
  const [notifications] = useState(7);

  const sections: SidebarSection[] = [
    // Section principale - Dashboard
    {
      title: 'Accueil',
      items: [
        {
          label: 'Tableau de bord',
          href: `/${locale}/merchant`,
          icon: Home,
          badge: 4,
        },
      ],
    },

    // Section Annonces
    {
      title: 'Annonces',
      items: [
        {
          label: 'Mes annonces',
          href: `/${locale}/merchant/announcements`,
          icon: Megaphone,
          badge: 2,
        },
        {
          label: 'Créer annonce',
          href: `/${locale}/merchant/announcements/create`,
          icon: Plus,
        },
      ],
    },

    // Section Catalogue
    {
      title: 'Catalogue',
      items: [
        {
          label: 'Mon catalogue',
          href: `/${locale}/merchant/catalog`,
          icon: ShoppingBag,
        },
        {
          label: 'Ajouter produit',
          href: `/${locale}/merchant/catalog/create`,
          icon: Plus,
        },
      ],
    },

    // Section Commandes et Livraisons
    {
      title: 'Commandes',
      items: [
        {
          label: 'Toutes les commandes',
          href: `/${locale}/merchant/orders`,
          icon: Package,
          badge: 3,
        },
        {
          label: 'Livraisons',
          href: `/${locale}/merchant/deliveries`,
          icon: Package,
        },
      ],
    },

    // Section Contrats et Documents
    {
      title: 'Documents',
      items: [
        {
          label: 'Mon contrat',
          href: `/${locale}/merchant/contract`,
          icon: FileText,
        },
        {
          label: 'Tous les contrats',
          href: `/${locale}/merchant/contracts`,
          icon: FileText,
        },
        {
          label: 'Mes documents',
          href: `/${locale}/merchant/documents`,
          icon: FileText,
        },
        {
          label: 'Vérification',
          href: `/${locale}/merchant/verification`,
          icon: CheckCircle,
        },
      ],
    },

    // Section Finance
    {
      title: 'Finance',
      items: [
        {
          label: 'Factures',
          href: `/${locale}/merchant/invoices`,
          icon: Receipt,
        },
        {
          label: 'Paiements',
          href: `/${locale}/merchant/payments`,
          icon: CreditCard,
        },
      ],
    },

    // Section Statistiques
    {
      title: 'Analytics',
      items: [
        {
          label: 'Mes statistiques',
          href: `/${locale}/merchant/stats`,
          icon: BarChart3,
        },
        {
          label: 'Clients',
          href: `/${locale}/merchant/stats/customers`,
          icon: Users,
        },
        {
          label: 'Ventes',
          href: `/${locale}/merchant/stats/sales`,
          icon: TrendingUp,
        },
      ],
    },

    // Section Communication
    {
      title: 'Communication',
      items: [
        {
          label: 'Messages',
          href: `/${locale}/merchant/messages`,
          icon: MessageSquare,
          badge: 1,
        },
      ],
    },

    // Section Profil
    {
      title: 'Mon compte',
      items: [
        {
          label: 'Mon profil',
          href: `/${locale}/merchant/profile`,
          icon: User,
        },
      ],
    },
  ];

  const userInfo = {
    name: 'Commerçant EcoDeli',
    email: 'merchant@ecodeli.com',
    avatar: '',
  };

  const quickAction = {
    label: 'Nouvelle annonce',
    icon: Megaphone,
    href: `/${locale}/merchant/announcements/create`,
  };

  return (
    <BaseSidebar
      locale={locale}
      sections={sections}
      title="Commerçant EcoDeli"
      userInfo={userInfo}
      quickAction={quickAction}
      notifications={notifications}
    />
  );
}
