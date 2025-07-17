"use client";

import { useTranslations } from "next-intl";
import { BaseSidebar } from "./base-sidebar";
import {
  Shield,
  Users,
  Package,
  FileText,
  BarChart3,
  Settings,
  CheckCircle,
  Clock,
  DollarSign,
  Truck,
  Building,
  UserCheck,
  FileX,
  Activity,
  Database,
  TestTube,
  FileCheck,
  AlertTriangle,
  MessageSquare,
  CreditCard,
  MapPin,
  Monitor,
  Handshake,
  FileImage,
  TrendingUp,
  Bell,
  Heart,
} from "lucide-react";
import { type EcoDeliUser } from "../types/layout.types";

// Interface temporaire pour la navigation (utilisée par BaseSidebar)
interface NavigationItem {
  key: string;
  label: string;
  href: string;
  icon?: any;
  category?: string;
  badge?: string;
  children?: NavigationItem[];
  disabled?: boolean;
}

interface AdminSidebarProps {
  user: EcoDeliUser;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AdminSidebar({
  user,
  collapsed,
  onToggle,
  className,
}: AdminSidebarProps) {
  const t = useTranslations("admin.navigation");
  const common = useTranslations("common");

  const navigationItems: NavigationItem[] = [
    // ===== DASHBOARD PRINCIPAL =====
    {
      key: "dashboard",
      label: t("dashboard"),
      href: "/admin",
      icon: <BarChart3 className="h-4 w-4" />,
      category: "main",
    },

    // ===== GESTION DES UTILISATEURS =====
    {
      key: "users",
      label: t("users"),
      href: "/admin/users",
      icon: <Users className="h-4 w-4" />,
      category: "users",
    },

    // ===== VÉRIFICATIONS ET DOCUMENTS =====
    {
      key: "verifications",
      label: t("verifications"),
      href: "/admin/verifications",
      icon: <CheckCircle className="h-4 w-4" />,
      category: "validation",
      badge: "3",
      children: [
        {
          key: "verifications-pending",
          label: t("pending"),
          href: "/admin/verifications/pending",
          icon: <Clock className="h-4 w-4" />,
          badge: "3",
        },
        {
          key: "verifications-approved",
          label: t("approved"),
          href: "/admin/verifications/approved",
          icon: <CheckCircle className="h-4 w-4" />,
        },
        {
          key: "verifications-rejected",
          label: t("rejected"),
          href: "/admin/verifications/rejected",
          icon: <FileX className="h-4 w-4" />,
        },
      ],
    },

    // ===== DOCUMENTS =====
    {
      key: "documents",
      label: t("documents"),
      href: "/admin/documents/validation",
      icon: <FileImage className="h-4 w-4" />,
      category: "validation",
    },

    // ===== LIVRAISONS =====
    {
      key: "deliveries",
      label: t("deliveries"),
      href: "/admin/deliveries",
      icon: <Package className="h-4 w-4" />,
      category: "operations",
    },

    {
      key: "deliveries-monitoring",
      label: t("deliveriesMonitoring"),
      href: "/admin/deliveries-monitoring",
      icon: <Monitor className="h-4 w-4" />,
      category: "operations",
    },

    // ===== ANNONCES =====
    {
      key: "announcements",
      label: t("announcements"),
      href: "/admin/announcements",
      icon: <FileText className="h-4 w-4" />,
      category: "content",
    },

    // ===== LITIGES =====
    {
      key: "disputes",
      label: t("disputes"),
      href: "/admin/disputes",
      icon: <MessageSquare className="h-4 w-4" />,
      category: "support",
    },

    // ===== TICKETS SUPPORT =====
    {
      key: "support-tickets",
      label: t("supportTickets"),
      href: "/admin/support-tickets",
      icon: <MessageSquare className="h-4 w-4" />,
      category: "support",
    },

    // ===== MODÉRATION =====
    {
      key: "moderation",
      label: t("moderation"),
      href: "/admin/moderation",
      icon: <Shield className="h-4 w-4" />,
      category: "content",
    },

    // ===== FINANCE =====
    {
      key: "finance",
      label: t("finance"),
      href: "/admin/finance",
      icon: <DollarSign className="h-4 w-4" />,
      category: "finance",
    },

    {
      key: "billing",
      label: t("billing"),
      href: "/admin/billing",
      icon: <CreditCard className="h-4 w-4" />,
      category: "finance",
    },

    // ===== FACTURATION PRESTATAIRES =====
    {
      key: "provider-billing",
      label: t("providerBilling"),
      href: "/admin/provider-billing",
      icon: <TrendingUp className="h-4 w-4" />,
      category: "finance",
    },

    // ===== CONTRATS =====
    {
      key: "contracts",
      label: t("contracts"),
      href: "/admin/contracts",
      icon: <Handshake className="h-4 w-4" />,
      category: "business",
    },

    // ===== ENTREPÔTS =====
    {
      key: "locations",
      label: t("locations"),
      href: "/admin/locations",
      icon: <Building className="h-4 w-4" />,
      category: "infrastructure",
    },

    // ===== ASSURANCE =====
    {
      key: "insurance",
      label: t("insurance"),
      href: "/admin/insurance",
      icon: <Heart className="h-4 w-4" />,
      category: "business",
    },

    // ===== PARRAINAGE =====
    {
      key: "referrals",
      label: t("referrals"),
      href: "/admin/referrals",
      icon: <UserCheck className="h-4 w-4" />,
      category: "marketing",
    },

    // ===== MONITORING =====
    {
      key: "monitoring",
      label: t("monitoring"),
      href: "/admin/monitoring",
      icon: <Activity className="h-4 w-4" />,
      category: "system",
    },

    // ===== CONFIGURATION SYSTÈME =====
    {
      key: "system-config",
      label: t("systemConfig"),
      href: "/admin/system-config",
      icon: <Settings className="h-4 w-4" />,
      category: "system",
    },

    // ===== PARAMÈTRES =====
    {
      key: "settings",
      label: t("settings"),
      href: "/admin/settings",
      icon: <Settings className="h-4 w-4" />,
      category: "system",
    },

    // ===== TESTS =====
    {
      key: "tests",
      label: t("tests"),
      href: "/admin/tests",
      icon: <TestTube className="h-4 w-4" />,
      category: "development",
    },
  ];

  return (
    <BaseSidebar
      role="ADMIN"
      user={user}
      navigationItems={navigationItems}
      collapsed={collapsed}
      onToggle={onToggle}
      className={className}
    />
  );
}
