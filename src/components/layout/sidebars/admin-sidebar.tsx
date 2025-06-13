"use client";

import { useState } from "react";
import {
  BarChart3,
  Users,
  FileCheck,
  Package,
  Briefcase,
  CreditCard,
  Settings,
  Megaphone,
  Building2,
  HelpCircle,
  ShieldCheck,
  Receipt,
  TrendingUp,
  Clock,
  DollarSign,
  PieChart,
  FileText,
  Bell,
  Search,
  AlertTriangle,
  Warehouse,
  Building,
  Truck,
  HardHat,
  Calculator,
  Calendar,
  Target,
  Archive,
  MessageSquare,
  Database,
  Globe,
  Zap,
  Coins,
  Banknote,
  TrendingDown,
  Monitor,
  BookOpen,
  UserCheck,
  ClipboardList,
  MapPin,
  Tag,
  Percent,
  RotateCcw,
  Bookmark,
  Star,
  Filter,
  Mail,
  Send,
  FileBarChart,
  Activity,
  Layers,
  Cloud,
  Cog,
  Shield,
  Server,
  Home,
} from "lucide-react";
import {
  BaseSidebar,
  type SidebarSection,
} from "@/components/layout/sidebars/base-sidebar";

interface AdminSidebarProps {
  locale: string;
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
  const [notifications] = useState(15);

  const sections: SidebarSection[] = [
    // Section principale - Dashboard
    {
      title: "Vue d'ensemble",
      items: [
        {
          label: "Tableau de bord",
          href: `/${locale}/admin`,
          icon: BarChart3,
          badge: 5,
        },
      ],
    },

    // Section Utilisateurs et vérifications
    {
      title: "Utilisateurs",
      items: [
        {
          label: "Tous les utilisateurs",
          href: `/${locale}/admin/users`,
          icon: Users,
          badge: 3,
        },
        {
          label: "Clients",
          href: `/${locale}/admin/clients`,
          icon: Users,
        },
        {
          label: "Livreurs",
          href: `/${locale}/admin/deliverers`,
          icon: Truck,
          badge: 2,
        },
        {
          label: "Commerçants",
          href: `/${locale}/admin/merchants`,
          icon: Building,
        },
        {
          label: "Prestataires",
          href: `/${locale}/admin/providers`,
          icon: HardHat,
        },
        {
          label: "Vérifications",
          href: `/${locale}/admin/verifications`,
          icon: FileCheck,
          badge: 12,
        },
        {
          label: "Vérif. livreurs",
          href: `/${locale}/admin/deliverers/verifications`,
          icon: UserCheck,
          badge: 7,
        },
        {
          label: "Vérif. prestataires",
          href: `/${locale}/admin/providers/verifications`,
          icon: UserCheck,
          badge: 5,
        },
      ],
    },

    // Section Opérations
    {
      title: "Opérations",
      items: [
        {
          label: "Livraisons",
          href: `/${locale}/admin/deliveries`,
          icon: Package,
          badge: 8,
        },
        {
          label: "Annonces",
          href: `/${locale}/admin/announcements`,
          icon: Megaphone,
        },
        {
          label: "Services",
          href: `/${locale}/admin/services`,
          icon: Briefcase,
        },
        {
          label: "Prestations",
          href: `/${locale}/admin/prestations`,
          icon: ClipboardList,
        },
        {
          label: "Catégories prestations",
          href: `/${locale}/admin/prestations/categories`,
          icon: Tag,
        },
        {
          label: "Tarifs prestations",
          href: `/${locale}/admin/prestations/pricing`,
          icon: DollarSign,
        },
      ],
    },

    // Section Contrats et Partenariats
    {
      title: "Contrats",
      items: [
        {
          label: "Tous les contrats",
          href: `/${locale}/admin/contracts`,
          icon: FileText,
        },
        {
          label: "Contrats en attente",
          href: `/${locale}/admin/contracts/pending`,
          icon: Clock,
          badge: 4,
        },
        {
          label: "Modèles de contrats",
          href: `/${locale}/admin/contracts/templates`,
          icon: FileText,
        },
        {
          label: "Créer modèle",
          href: `/${locale}/admin/contracts/templates/create`,
          icon: FileText,
        },
        {
          label: "Contrats commerçants",
          href: `/${locale}/admin/merchants/contracts`,
          icon: Building,
        },
      ],
    },

    // Section Finance
    {
      title: "Finance",
      items: [
        {
          label: "Facturation",
          href: `/${locale}/admin/billing`,
          icon: Receipt,
        },
        {
          label: "Factures",
          href: `/${locale}/admin/invoices`,
          icon: Receipt,
        },
        {
          label: "Paiements",
          href: `/${locale}/admin/payments`,
          icon: CreditCard,
          badge: 6,
        },
        {
          label: "Commissions",
          href: `/${locale}/admin/payments/commissions`,
          icon: Percent,
        },
        {
          label: "Comptabilité",
          href: `/${locale}/admin/finance/accounting`,
          icon: Calculator,
        },
        {
          label: "Prévisions",
          href: `/${locale}/admin/finance/forecasts`,
          icon: TrendingUp,
        },
        {
          label: "Trésorerie",
          href: `/${locale}/admin/finance/treasury`,
          icon: Banknote,
        },
      ],
    },

    // Section Configuration et Tarification
    {
      title: "Configuration",
      items: [
        {
          label: "Paramètres système",
          href: `/${locale}/admin/settings`,
          icon: Settings,
        },
        {
          label: "Taux de commission",
          href: `/${locale}/admin/config/commission-rates`,
          icon: Percent,
        },
        {
          label: "Config notifications",
          href: `/${locale}/admin/config/notifications`,
          icon: Bell,
        },
        {
          label: "Règles tarifaires",
          href: `/${locale}/admin/config/pricing-rules`,
          icon: Calculator,
        },
        {
          label: "Tarification",
          href: `/${locale}/admin/pricing`,
          icon: DollarSign,
        },
        {
          label: "Historique tarifs",
          href: `/${locale}/admin/pricing/history`,
          icon: Clock,
        },
        {
          label: "Simulateur prix",
          href: `/${locale}/admin/pricing/simulator`,
          icon: Calculator,
        },
      ],
    },

    // Section Entrepôts et Logistique
    {
      title: "Logistique",
      items: [
        {
          label: "Entrepôts",
          href: `/${locale}/admin/warehouses`,
          icon: Warehouse,
        },
        {
          label: "Créer entrepôt",
          href: `/${locale}/admin/warehouses/create`,
          icon: Warehouse,
        },
      ],
    },

    // Section Communication
    {
      title: "Communication",
      items: [
        {
          label: "Notifications",
          href: `/${locale}/admin/notifications`,
          icon: Bell,
          badge: notifications,
        },
        {
          label: "Campagnes notifs",
          href: `/${locale}/admin/notifications/campaigns`,
          icon: Send,
        },
        {
          label: "Créer campagne",
          href: `/${locale}/admin/notifications/campaigns/create`,
          icon: Send,
        },
        {
          label: "Modèles notifs",
          href: `/${locale}/admin/notifications/templates`,
          icon: Mail,
        },
      ],
    },

    // Section Rapports et Analytics
    {
      title: "Analytics",
      items: [
        {
          label: "Rapports",
          href: `/${locale}/admin/reports`,
          icon: FileBarChart,
        },
        {
          label: "Audit système",
          href: `/${locale}/admin/audit`,
          icon: ShieldCheck,
        },
        {
          label: "Logs système",
          href: `/${locale}/admin/logs`,
          icon: Database,
        },
      ],
    },

    // Section Support et Aide
    {
      title: "Support",
      items: [
        {
          label: "Support client",
          href: `/${locale}/admin/support`,
          icon: HelpCircle,
          badge: 3,
        },
        {
          label: "Gestion FAQ",
          href: `/${locale}/admin/support/faq-management`,
          icon: BookOpen,
        },
      ],
    },
  ];

  const userInfo = {
    name: "Administrateur",
    email: "admin@ecodeli.me",
    avatar: "",
  };

  const quickAction = {
    label: "Créer utilisateur",
    icon: Users,
    href: `/${locale}/admin/users/create`,
  };

  return (
    <BaseSidebar
      locale={locale}
      sections={sections}
      title="Admin EcoDeli"
      userInfo={userInfo}
      quickAction={quickAction}
      notifications={notifications}
    />
  );
}
