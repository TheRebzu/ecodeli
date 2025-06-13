"use client";

import { useState } from "react";
import {
  Home,
  Calendar,
  Briefcase,
  Award,
  Receipt,
  MessageSquare,
  Bell,
  User,
  BarChart3,
  CreditCard,
  FileText,
  Clock,
  Star,
  DollarSign,
  Settings,
  Shield,
  CheckCircle,
  TrendingUp,
  Users,
  Plus,
  Edit,
  Eye,
  MapPin,
  Activity,
  Target,
  Archive,
  Globe,
  Layers,
  Zap,
  BookOpen,
  Hammer,
  Wrench,
  HardHat,
  Award as Certificate,
  FileBarChart,
  PieChart,
  Calendar as CalendarIcon,
  Handshake,
  Banknote,
} from "lucide-react";
import {
  BaseSidebar,
  type SidebarSection,
} from "@/components/layout/sidebars/base-sidebar";

interface ProviderSidebarProps {
  locale: string;
}

export function ProviderSidebar({ locale }: ProviderSidebarProps) {
  const [notifications] = useState(4);

  const sections: SidebarSection[] = [
    // Section principale - Dashboard
    {
      title: "Accueil",
      items: [
        {
          label: "Tableau de bord",
          href: `/${locale}/provider`,
          icon: Home,
          badge: 3,
        },
      ],
    },

    // Section Rendez-vous et interventions
    {
      title: "Planning",
      items: [
        {
          label: "Mes rendez-vous",
          href: `/${locale}/provider/appointments`,
          icon: Calendar,
          badge: 2,
        },
        {
          label: "Mon planning",
          href: `/${locale}/provider/schedule`,
          icon: CalendarIcon,
        },
      ],
    },

    // Section Services et compétences
    {
      title: "Services",
      items: [
        {
          label: "Mes services",
          href: `/${locale}/provider/services`,
          icon: Briefcase,
        },
        {
          label: "Créer service",
          href: `/${locale}/provider/services/create`,
          icon: Plus,
        },
        {
          label: "Mes compétences",
          href: `/${locale}/provider/skills`,
          icon: Award,
        },
        {
          label: "Ajouter compétence",
          href: `/${locale}/provider/skills/add`,
          icon: Plus,
        },
        {
          label: "Certifications",
          href: `/${locale}/provider/skills/certifications`,
          icon: Certificate,
        },
      ],
    },

    // Section Documents et contrats
    {
      title: "Documents",
      items: [
        {
          label: "Mes documents",
          href: `/${locale}/provider/documents`,
          icon: FileText,
        },
        {
          label: "Contrats",
          href: `/${locale}/provider/contracts`,
          icon: FileText,
        },
        {
          label: "Négociation",
          href: `/${locale}/provider/contracts/negotiation`,
          icon: Handshake,
        },
        {
          label: "Vérification",
          href: `/${locale}/provider/verification`,
          icon: CheckCircle,
        },
      ],
    },

    // Section Facturation
    {
      title: "Finance",
      items: [
        {
          label: "Mes factures",
          href: `/${locale}/provider/invoices`,
          icon: Receipt,
        },
        {
          label: "Facturation",
          href: `/${locale}/provider/billing`,
          icon: Receipt,
        },
        {
          label: "Factures automatiques",
          href: `/${locale}/provider/billing/automatic-invoices`,
          icon: Zap,
        },
      ],
    },

    // Section Évaluations
    {
      title: "Évaluations",
      items: [
        {
          label: "Mes évaluations",
          href: `/${locale}/provider/ratings`,
          icon: Star,
        },
      ],
    },

    // Section Statistiques
    {
      title: "Performance",
      items: [
        {
          label: "Mes statistiques",
          href: `/${locale}/provider/stats`,
          icon: BarChart3,
        },
        {
          label: "Rapport mensuel",
          href: `/${locale}/provider/stats/monthly-report`,
          icon: FileBarChart,
        },
      ],
    },

    // Section Communication
    {
      title: "Communication",
      items: [
        {
          label: "Messages",
          href: `/${locale}/provider/messages`,
          icon: MessageSquare,
          badge: 1,
        },
      ],
    },

    // Section Profil
    {
      title: "Mon compte",
      items: [
        {
          label: "Mon profil",
          href: `/${locale}/provider/profile`,
          icon: User,
        },
      ],
    },
  ];

  const userInfo = {
    name: "Prestataire EcoDeli",
    email: "provider@ecodeli.me",
    avatar: "",
  };

  const quickAction = {
    label: "Nouveau service",
    icon: Briefcase,
    href: `/${locale}/provider/services/create`,
  };

  return (
    <BaseSidebar
      locale={locale}
      sections={sections}
      title="Prestataire EcoDeli"
      userInfo={userInfo}
      quickAction={quickAction}
      notifications={notifications}
    />
  );
}
