"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AdminHeader } from '@/components/layout/headers/admin-header';
import { AdminSidebar } from '@/components/layout/sidebars/admin-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { type EcoDeliUser } from '@/components/layout/types/layout.types';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log("🚨 Accès refusé: Utilisateur non authentifié");
        router.push("/fr/login");
        return;
      }
      
      if (user.role !== "ADMIN") {
        console.log(`🚨 Accès refusé: Utilisateur ${user.role} tente d'accéder au panel admin`);
        router.push(`/fr/${user.role.toLowerCase()}/`);
        return;
      }
    }
  }, [user, authLoading, router]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Convert AuthUser to EcoDeliUser format
  const convertToEcoDeliUser = (authUser: typeof user): EcoDeliUser | null => {
    if (!authUser) return null;
    
    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.firstName && authUser.lastName 
        ? `${authUser.firstName} ${authUser.lastName}`
        : authUser.email.split('@')[0],
      avatar: '',
      role: authUser.role as EcoDeliUser['role'],
      profile: {
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        phone: authUser.phone,
        verified: authUser.emailVerified || false
      },
      subscription: {
        plan: 'PREMIUM', // Admin always has premium access
        status: 'active'
      },
      stats: {
        totalDeliveries: 0,
        totalEarnings: 0,
        rating: 5,
        completionRate: 100
      },
      emailVerified: authUser.emailVerified || false,
      isActive: authUser.status === 'ACTIVE' || authUser.status === 'VERIFIED',
      validationStatus: 'APPROVED', // Admin is always approved
      subscriptionPlan: 'PREMIUM',
      rating: 5
    };
  };

  const ecoDeliUser = convertToEcoDeliUser(user);

  // Mock notifications for admin
  const mockNotifications = [
    {
      id: '1',
      title: 'Validation requise',
      message: '15 documents livreurs en attente de validation',
      type: 'warning' as const,
      read: false,
      createdAt: new Date(),
      priority: 'high' as const
    },
    {
      id: '2',
      title: 'Litige livraison',
      message: 'Nouveau litige signalé #DL-2024-001',
      type: 'error' as const,
      read: false,
      createdAt: new Date(),
      priority: 'high' as const
    },
    {
      id: '3',
      title: 'Maintenance système',
      message: 'Maintenance programmée ce soir à 23h',
      type: 'info' as const,
      read: true,
      createdAt: new Date(),
      priority: 'medium' as const
    }
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Chargement du panel admin...</p>
        </div>
      </div>
    );
  }

  if (!user || !ecoDeliUser) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 text-red-600 mx-auto text-2xl">⚠️</div>
          <p className="mt-4 text-muted-foreground">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 text-red-600 mx-auto text-2xl">🚫</div>
          <p className="mt-4 text-muted-foreground">Accès refusé - Redirection vers votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={!sidebarCollapsed}>
      <div className="flex h-screen bg-background dark:bg-background">
        {/* Desktop Sidebar */}
        <AdminSidebar 
          user={ecoDeliUser}
          collapsed={sidebarCollapsed}
        />

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-background border-r border-border">
              <AdminSidebar 
                user={ecoDeliUser}
                collapsed={false}
              />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <AdminHeader
            user={{
              id: user.id,
              name: user.email.split('@')[0], // Use email prefix as name fallback
              email: user.email,
              role: user.role,
              adminLevel: 'SUPER_ADMIN', // This would come from user profile
              avatar: '' // Avatar would be loaded from profile
            }}
            onSidebarToggle={toggleMobileMenu}
            notifications={mockNotifications}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-background dark:bg-background">
            <div className="p-6">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </div>
          </main>
        </SidebarInset>

        {/* Toast Notifications */}
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
