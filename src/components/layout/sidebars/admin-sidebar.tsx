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
  AlertTriangle
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
    // ===== FONCTIONNALITÉS COMPLÈTES =====
    
    // Dashboard principal
    {
      key: 'dashboard',
      label: t('dashboard'),
      href: '/admin',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'main'
    },
    
    // Vérifications et Documents - SYSTÈME COMPLET
    {
      key: 'verifications',
      label: t('verifications.title'),
      href: '/admin/verifications',
      icon: <CheckCircle className="h-4 w-4" />,
      category: 'validation',
      badge: '3', // TODO: dynamic count
      children: [
        {
          key: 'verifications-pending',
          label: t('verifications.pending'),
          href: '/admin/verifications/pending',
          icon: <Clock className="h-4 w-4" />,
          badge: '3'
        },
        {
          key: 'verifications-approved',
          label: t('verifications.approved'),
          href: '/admin/verifications/approved',
          icon: <CheckCircle className="h-4 w-4" />
        },
        {
          key: 'verifications-rejected',
          label: t('verifications.rejected'),
          href: '/admin/verifications/rejected',
          icon: <FileX className="h-4 w-4" />
        },
        {
          key: 'verifications-incomplete',
          label: t('verifications.incomplete'),
          href: '/admin/verifications/incomplete',
          icon: <AlertTriangle className="h-4 w-4" />
        }
      ]
    },

    // Gestion des utilisateurs - FONCTIONNEL
    {
      key: 'users',
      label: t('users.title'),
      href: '/admin/users',
      icon: <Users className="h-4 w-4" />,
      category: 'users'
    },

    // Livraisons - VUE D'ENSEMBLE DISPONIBLE
    {
      key: 'deliveries',
      label: t('deliveries.title'),
      href: '/admin/deliveries',
      icon: <Package className="h-4 w-4" />,
      category: 'operations'
    },

    // Tests Admin - FONCTIONNEL
    {
      key: 'tests',
      label: 'Tests Admin',
      href: '/admin/tests',
      icon: <TestTube className="h-4 w-4" />,
      category: 'development'
    },

    // ===== FONCTIONNALITÉS EN DÉVELOPPEMENT =====
    // Note: Ces sections ont des API mais pas d'interface complète

    // Finance - API DISPONIBLE, interface en cours
    {
      key: 'finance',
      label: t('finance.title') + ' (Dev)',
      href: '#',
      icon: <DollarSign className="h-4 w-4" />,
      category: 'development',
      disabled: true,
      children: [
        {
          key: 'finance-note',
          label: 'API disponible - Interface en cours',
          href: '#',
          icon: <Database className="h-4 w-4" />,
          disabled: true
        }
      ]
    },

    // Contrats - API DISPONIBLE
    {
      key: 'contracts',
      label: 'Contrats (API)',
      href: '#',
      icon: <FileText className="h-4 w-4" />,
      category: 'development',
      disabled: true
    },

    // Settings/Configuration - API DISPONIBLE
    {
      key: 'settings',
      label: t('system.settings') + ' (API)',
      href: '#',
      icon: <Settings className="h-4 w-4" />,
      category: 'development',
      disabled: true
    },

    // ===== ENDPOINTS API DISPONIBLES =====
    {
      key: 'api-info',
      label: '📡 APIs Disponibles',
      href: '#',
      icon: <Database className="h-4 w-4" />,
      category: 'development',
      disabled: true,
      children: [
        {
          key: 'api-payments',
          label: '• Payments API',
          href: '#',
          icon: <DollarSign className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-announcements',
          label: '• Announcements API',
          href: '#',
          icon: <Package className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-services',
          label: '• Services API',
          href: '#',
          icon: <Activity className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-support',
          label: '• Support API',
          href: '#',
          icon: <FileText className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-referral',
          label: '• Referral API',
          href: '#',
          icon: <UserCheck className="h-4 w-4" />,
          disabled: true
        },
        {
          key: 'api-push',
          label: '• Push Notifications API',
          href: '#',
          icon: <Activity className="h-4 w-4" />,
          disabled: true
        }
      ]
    }
  ];

  return (
    <BaseSidebar
      title="EcoDeli Admin"
      subtitle={`Admin Panel`}
      icon={<Shield className="h-6 w-6" />}
      role="ADMIN"
      user={user}
      navigationItems={navigationItems}
      collapsed={collapsed}
      onToggle={onToggle}
      className={className}
    />
  );
} 