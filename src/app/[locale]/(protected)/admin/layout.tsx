"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/sidebars/admin-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleLogout = async () => {
    try {
      // TODO: Implement proper logout with Better Auth
      router.push("/fr/login");
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // TODO: Get real data from API
  const pendingValidations = 3;
  const systemAlerts = 1;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 text-red-600 mx-auto animate-pulse">🔄</div>
          <p className="mt-4 text-gray-600">Chargement du panel admin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 text-red-600 mx-auto">⚠️</div>
          <p className="mt-4 text-gray-600">Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 text-red-600 mx-auto">🚫</div>
          <p className="mt-4 text-gray-600">Accès refusé - Redirection vers votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider 
      defaultOpen={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
    >
      <div className="flex h-screen bg-background w-full">
        {/* Sidebar */}
        <AdminSidebar 
          collapsed={sidebarCollapsed}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            validationStatus: user.validationStatus || 'VALIDATED'
          }}
        />

        {/* Main Content */}
        <SidebarInset className="flex-1 w-full">
          {/* Header */}
          <AdminHeader
            user={{
              name: user.name || '',
              email: user.email,
            }}
            onLogout={handleLogout}
            pendingValidations={pendingValidations}
            systemAlerts={systemAlerts}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </SidebarInset>

        {/* Toast Notifications */}
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
