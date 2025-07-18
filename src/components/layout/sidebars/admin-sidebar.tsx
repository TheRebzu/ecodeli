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

    // ===== ANNONCES =====
    {
      key: "announcements",
      label: t("announcements"),
      href: "/admin/announcements",
      icon: <FileText className="h-4 w-4" />,
      category: "content",
    },

    // ===== ENTREPÔTS =====
    {
      key: "locations",
      label: t("locations"),
      href: "/admin/locations",
      icon: <Building className="h-4 w-4" />,
      category: "infrastructure",
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
