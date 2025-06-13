"use client";

import { useState } from "react";
import {
  Home,
  Megaphone,
  Package,
  Briefcase,
  Calendar,
  CreditCard,
  MessageSquare,
  Bell,
  User,
  Star,
  Settings,
  HelpCircle,
  Receipt,
  Bookmark,
  Search,
  FileText,
  MapPin,
  Clock,
  TrendingUp,
  Archive,
  ShoppingBag,
  Truck,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Target,
  Users,
  Zap,
  Globe,
  Layers,
  Crown,
} from "lucide-react";
import {
  BaseSidebar,
  type SidebarSection,
} from "@/components/layout/sidebars/base-sidebar";
import { useAuth } from "@/hooks/auth/use-auth";
import { useSession } from "next-auth/react";

interface ClientSidebarProps {
  locale: string;
}

export function ClientSidebar({ locale }: ClientSidebarProps) {
  const { user } = useAuth();
  const { data: session } = useSession();
  const [notifications] = useState(8);

  // Récupérer les informations de l'utilisateur connecté
  const userInfo = {
    name: session?.user?.name || user?.name || "Utilisateur",
    email: session?.user?.email || user?.email || "utilisateur@ecodeli.me",
    avatar: user?.image || undefined,
  };

  const sections: SidebarSection[] = [
    // Section principale - Dashboard
    {
      title: "Accueil",
      items: [
        {
          label: "Tableau de bord",
          href: `/${locale}/client`,
          icon: Home,
          badge: 3,
        },
      ],
    },

    // Section Annonces et Services
    {
      title: "Services",
      items: [
        {
          label: "Mes annonces",
          href: `/${locale}/client/announcements`,
          icon: Megaphone,
          badge: 2,
        },
        {
          label: "Créer annonce",
          href: `/${locale}/client/announcements/create`,
          icon: Megaphone,
        },
        {
          label: "Services disponibles",
          href: `/${locale}/client/services`,
          icon: Briefcase,
        },
        {
          label: "Réserver service",
          href: `/${locale}/client/services/book`,
          icon: Calendar,
        },
        {
          label: "Mes réservations",
          href: `/${locale}/client/services/bookings`,
          icon: Calendar,
        },
      ],
    },

    // Section Livraisons
    {
      title: "Livraisons",
      items: [
        {
          label: "Mes livraisons",
          href: `/${locale}/client/deliveries`,
          icon: Package,
          badge: 1,
        },
      ],
    },

    // Section Storage/Entreposage
    {
      title: "Entreposage",
      items: [
        {
          label: "Mes boxes",
          href: `/${locale}/client/storage`,
          icon: Archive,
        },
        {
          label: "Rechercher box",
          href: `/${locale}/client/storage/search`,
          icon: Search,
        },
      ],
    },

    // Section Rendez-vous
    {
      title: "Rendez-vous",
      items: [
        {
          label: "Mes rendez-vous",
          href: `/${locale}/client/appointments`,
          icon: Calendar,
        },
        {
          label: "Historique RDV",
          href: `/${locale}/client/appointments/history`,
          icon: Clock,
        },
      ],
    },

    // Section Contrats et Documents
    {
      title: "Documents",
      items: [
        {
          label: "Mes contrats",
          href: `/${locale}/client/contracts`,
          icon: FileText,
        },
        {
          label: "Factures",
          href: `/${locale}/client/invoices`,
          icon: Receipt,
        },
      ],
    },

    // Section Paiements et Facturation
    {
      title: "Paiements",
      items: [
        {
          label: "Mes paiements",
          href: `/${locale}/client/payments`,
          icon: CreditCard,
        },
        {
          label: "Abonnement",
          href: `/${locale}/client/subscription`,
          icon: Crown,
        },
      ],
    },

    // Section Évaluations
    {
      title: "Évaluations",
      items: [
        {
          label: "Mes avis",
          href: `/${locale}/client/reviews`,
          icon: Star,
        },
        {
          label: "Avis en attente",
          href: `/${locale}/client/reviews/pending`,
          icon: Clock,
          badge: 2,
        },
      ],
    },

    // Section Communication
    {
      title: "Communication",
      items: [
        {
          label: "Messages",
          href: `/${locale}/client/messages`,
          icon: MessageSquare,
          badge: 4,
        },
        {
          label: "Notifications",
          href: `/${locale}/client/notifications`,
          icon: Bell,
          badge: notifications,
        },
      ],
    },

    // Section Profil et Paramètres
    {
      title: "Mon compte",
      items: [
        {
          label: "Mon profil",
          href: `/${locale}/client/profile`,
          icon: User,
        },
      ],
    },
  ];

  const quickAction = {
    label: "Nouvelle annonce",
    icon: Megaphone,
    href: `/${locale}/client/announcements/create`,
  };

  const subscriptionInfo = {
    plan: "Premium",
    href: `/${locale}/client/subscription`,
  };

  return (
    <BaseSidebar
      locale={locale}
      sections={sections}
      title="EcoDeli Client"
      userInfo={userInfo}
      quickAction={quickAction}
      subscriptionInfo={subscriptionInfo}
      notifications={notifications}
    />
  );
}
