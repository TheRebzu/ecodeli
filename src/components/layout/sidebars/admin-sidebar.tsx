"use client";

import { useTranslations } from 'next-intl';
import { BaseSidebar } from './base-sidebar';
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
  Heart
} from 'lucide-react';
import { type EcoDeliUser } from '../types/layout.types';

// Interface temporaire pour la navigation (utilisée par BaseSidebar)
interface NavigationItem {
  key: string
  label: string
  href: string
  icon?: any
  category?: string
  badge?: string
  children?: NavigationItem[]
  disabled?: boolean
}

interface AdminSidebarProps {
  user: EcoDeliUser;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AdminSidebar({ user, collapsed, onToggle, className }: AdminSidebarProps) {
  const t = useTranslations('admin.navigation');
  const common = useTranslations('common');

  const navigationItems: NavigationItem[] = [
    // ===== DASHBOARD PRINCIPAL =====
    {
      key: 'dashboard',
      label: t('dashboard'),
      href: '/admin',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'main'
    },

    // ===== GESTION DES UTILISATEURS =====
    {
      key: 'users',
      label: 'Gestion Utilisateurs',
      href: '/admin/users',
      icon: <Users className="h-4 w-4" />,
      category: 'users'
    },

    // ===== VÉRIFICATIONS ET DOCUMENTS =====
    {
      key: 'verifications',
      label: 'Vérifications',
      href: '/admin/verifications',
      icon: <CheckCircle className="h-4 w-4" />,
      category: 'validation',
      badge: '3',
      children: [
        {
          key: 'verifications-pending',
          label: 'En attente',
          href: '/admin/verifications/pending',
          icon: <Clock className="h-4 w-4" />,
          badge: '3'
        },
        {
          key: 'verifications-approved',
          label: 'Approuvées',
          href: '/admin/verifications/approved',
          icon: <CheckCircle className="h-4 w-4" />
        },
        {
          key: 'verifications-rejected',
          label: 'Rejetées',
          href: '/admin/verifications/rejected',
          icon: <FileX className="h-4 w-4" />
        }
      ]
    },

    // ===== DOCUMENTS =====
    {
      key: 'documents',
      label: 'Documents',
      href: '/admin/documents',
      icon: <FileImage className="h-4 w-4" />,
      category: 'validation'
    },

    // ===== LIVRAISONS =====
    {
      key: 'deliveries',
      label: 'Livraisons',
      href: '/admin/deliveries',
      icon: <Package className="h-4 w-4" />,
      category: 'operations'
    },

    {
      key: 'deliveries-monitoring',
      label: 'Monitoring Livraisons',
      href: '/admin/deliveries-monitoring',
      icon: <Monitor className="h-4 w-4" />,
      category: 'operations'
    },

    // ===== ANNONCES =====
    {
      key: 'announcements',
      label: 'Annonces',
      href: '/admin/announcements',
      icon: <FileText className="h-4 w-4" />,
      category: 'content'
    },

    // ===== LITIGES =====
    {
      key: 'disputes',
      label: 'Litiges',
      href: '/admin/disputes',
      icon: <MessageSquare className="h-4 w-4" />,
      category: 'support'
    },

    // ===== MODÉRATION =====
    {
      key: 'moderation',
      label: 'Modération',
      href: '/admin/moderation',
      icon: <Shield className="h-4 w-4" />,
      category: 'content'
    },

    // ===== FINANCE =====
    {
      key: 'finance',
      label: 'Finance',
      href: '/admin/finance',
      icon: <DollarSign className="h-4 w-4" />,
      category: 'finance'
    },

    {
      key: 'billing',
      label: 'Facturation',
      href: '/admin/billing',
      icon: <CreditCard className="h-4 w-4" />,
      category: 'finance'
    },

    // ===== FACTURATION PRESTATAIRES =====
    {
      key: 'provider-billing',
      label: 'Facturation Prestataires',
      href: '/admin/provider-billing',
      icon: <TrendingUp className="h-4 w-4" />,
      category: 'finance'
    },

    // ===== CONTRATS =====
    {
      key: 'contracts',
      label: 'Contrats',
      href: '/admin/contracts',
      icon: <Handshake className="h-4 w-4" />,
      category: 'business'
    },

    // ===== ENTREPÔTS =====
    {
      key: 'locations',
      label: 'Entrepôts',
      href: '/admin/locations',
      icon: <Building className="h-4 w-4" />,
      category: 'infrastructure'
    },

    // ===== ASSURANCE =====
    {
      key: 'insurance',
      label: 'Assurance',
      href: '/admin/insurance',
      icon: <Heart className="h-4 w-4" />,
      category: 'business'
    },

    // ===== PARRAINAGE =====
    {
      key: 'referrals',
      label: 'Parrainage',
      href: '/admin/referrals',
      icon: <UserCheck className="h-4 w-4" />,
      category: 'marketing'
    },

    // ===== MONITORING =====
    {
      key: 'monitoring',
      label: 'Monitoring',
      href: '/admin/monitoring',
      icon: <Activity className="h-4 w-4" />,
      category: 'system'
    },

    // ===== CONFIGURATION SYSTÈME =====
    {
      key: 'system-config',
      label: 'Configuration Système',
      href: '/admin/system-config',
      icon: <Settings className="h-4 w-4" />,
      category: 'system'
    },

    // ===== PARAMÈTRES =====
    {
      key: 'settings',
      label: 'Paramètres',
      href: '/admin/settings',
      icon: <Settings className="h-4 w-4" />,
      category: 'system'
    },

    // ===== TESTS =====
    {
      key: 'tests',
      label: 'Tests Admin',
      href: '/admin/tests',
      icon: <TestTube className="h-4 w-4" />,
      category: 'development'
    }
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