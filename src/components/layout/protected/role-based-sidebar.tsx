'use client';

import { UserRole } from '@prisma/client';
import { AdminSidebar } from '../sidebars/admin-sidebar';
import { ClientSidebar } from '../sidebars/client-sidebar';
import { DelivererSidebar } from '../sidebars/deliverer-sidebar';
import { MerchantSidebar } from '../sidebars/merchant-sidebar';
import { ProviderSidebar } from '../sidebars/provider-sidebar';

interface RoleBasedSidebarProps {
  locale: string;
  userRole: UserRole;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
    isVerified?: boolean;
  };
}

export function RoleBasedSidebar({ locale, userRole, user }: RoleBasedSidebarProps) {
  switch (userRole) {
    case UserRole.ADMIN:
      return <AdminSidebar locale={locale} />;
    case UserRole.CLIENT:
      return <ClientSidebar locale={locale} />;
    case UserRole.DELIVERER:
      return <DelivererSidebar locale={locale} />;
    case UserRole.MERCHANT:
      return <MerchantSidebar locale={locale} />;
    case UserRole.PROVIDER:
      return <ProviderSidebar locale={locale} />;
    default:
      // Fallback vers sidebar client par défaut
      return <ClientSidebar locale={locale} />;
  }
}
