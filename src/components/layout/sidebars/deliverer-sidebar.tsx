"use client";

import { useState } from "react";
import {
  Home,
  Truck,
  Megaphone,
  Calendar,
  FileText,
  MessageSquare,
  Bell,
  User,
  CreditCard,
  BarChart3,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  Route,
  CheckCircle,
  Activity,
  Wallet,
  Download,
  Settings,
  Shield,
  Star,
  Package,
  Navigation,
  Award,
  Target,
  Briefcase,
  AlertCircle,
  Archive,
  Users,
  Globe,
} from "lucide-react";
import {
  BaseSidebar,
  type SidebarSection,
} from "@/components/layout/sidebars/base-sidebar";

interface DelivererSidebarProps {
  locale: string;
}

export function DelivererSidebar({ locale }: DelivererSidebarProps) {
  const [notifications] = useState(6);

  const sections: SidebarSection[] = [
    // Section principale - Dashboard
    {
      title: "Accueil",
      items: [
        {
          label: "Tableau de bord",
          href: `/${locale}/deliverer`,
          icon: Home,
          badge: 2,
        },
      ],
    },

    // Section Annonces et opportunités
    {
      title: "Opportunités",
      items: [
        {
          label: "Annonces disponibles",
          href: `/${locale}/deliverer/announcements`,
          icon: Megaphone,
          badge: 5,
        },
      ],
    },

    // Section Livraisons
    {
      title: "Livraisons",
      items: [
        {
          label: "Livraisons actives",
          href: `/${locale}/deliverer/deliveries/active`,
          icon: Package,
          badge: 3,
        },
        {
          label: "Toutes les livraisons",
          href: `/${locale}/deliverer/deliveries`,
          icon: Truck,
        },
      ],
    },

    // Section Planning et disponibilités
    {
      title: "Planning",
      items: [
        {
          label: "Mon planning",
          href: `/${locale}/deliverer/schedule`,
          icon: Calendar,
        },
        {
          label: "Disponibilités",
          href: `/${locale}/deliverer/availability`,
          icon: Clock,
        },
        {
          label: "Mes trajets",
          href: `/${locale}/deliverer/my-routes`,
          icon: Route,
        },
        {
          label: "Créer trajet",
          href: `/${locale}/deliverer/my-routes/create`,
          icon: MapPin,
        },
      ],
    },

    // Section Documents et vérifications
    {
      title: "Documents",
      items: [
        {
          label: "Mes documents",
          href: `/${locale}/deliverer/documents`,
          icon: FileText,
        },
        {
          label: "Contrats",
          href: `/${locale}/deliverer/contracts`,
          icon: FileText,
        },
        {
          label: "Conditions",
          href: `/${locale}/deliverer/contracts/terms`,
          icon: Shield,
        },
      ],
    },

    // Section Financier
    {
      title: "Finance",
      items: [
        {
          label: "Mon portefeuille",
          href: `/${locale}/deliverer/wallet`,
          icon: Wallet,
        },
        {
          label: "Retrait",
          href: `/${locale}/deliverer/wallet/withdrawal`,
          icon: Download,
        },
        {
          label: "Paiements",
          href: `/${locale}/deliverer/payments`,
          icon: CreditCard,
        },
      ],
    },

    // Section Statistiques et performance
    {
      title: "Performance",
      items: [
        {
          label: "Mes statistiques",
          href: `/${locale}/deliverer/stats`,
          icon: BarChart3,
        },
        {
          label: "Gains",
          href: `/${locale}/deliverer/stats/earnings`,
          icon: DollarSign,
        },
        {
          label: "Performance",
          href: `/${locale}/deliverer/stats/performance`,
          icon: TrendingUp,
        },
      ],
    },

    // Section Communication
    {
      title: "Communication",
      items: [
        {
          label: "Messages",
          href: `/${locale}/deliverer/messages`,
          icon: MessageSquare,
          badge: 2,
        },
        {
          label: "Notifications",
          href: `/${locale}/deliverer/notifications`,
          icon: Bell,
          badge: notifications,
        },
      ],
    },

    // Section Profil
    {
      title: "Mon compte",
      items: [
        {
          label: "Mon profil",
          href: `/${locale}/deliverer/profile`,
          icon: User,
        },
      ],
    },
  ];

  const userInfo = {
    name: "Livreur EcoDeli",
    email: "deliverer@ecodeli.me",
    avatar: "",
  };

  const quickAction = {
    label: "Voir livraisons",
    icon: Package,
    href: `/${locale}/deliverer/deliveries/active`,
  };

  return (
    <BaseSidebar
      locale={locale}
      sections={sections}
      title="Livreur EcoDeli"
      userInfo={userInfo}
      quickAction={quickAction}
      notifications={notifications}
    />
  );
}
