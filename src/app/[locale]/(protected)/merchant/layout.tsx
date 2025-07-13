"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { MerchantHeader } from "@/components/layout/headers/merchant-header";
import { MerchantSidebar } from "@/components/layout/sidebars/merchant-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Mock notifications for merchant
  const mockNotifications = [
    {
      id: "1",
      title: "Nouvelle commande",
      message: "Commande #CMD-001 reçue pour livraison demain",
      type: "info" as const,
      read: false,
      createdAt: new Date(),
    },
    {
      id: "2",
      title: "Contrat à renouveler",
      message: "Votre contrat EcoDeli expire dans 30 jours",
      type: "warning" as const,
      read: false,
      createdAt: new Date(),
    },
    {
      id: "3",
      title: "Paiement reçu",
      message: "Commission de 85€ créditée sur votre compte",
      type: "success" as const,
      read: true,
      createdAt: new Date(),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== "MERCHANT") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-background dark:bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex transition-all duration-300 ease-in-out border-r border-border",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        <MerchantSidebar
          collapsed={sidebarCollapsed}
          user={{
            id: user.id,
            name: user.name || user.email.split("@")[0],
            email: user.email,
            role: user.role,
          }}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-background border-r border-border">
            <MerchantSidebar
              collapsed={false}
              user={{
                id: user.id,
                name: user.name || user.email.split("@")[0],
                email: user.email,
                role: user.role,
              }}
            />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <MerchantHeader
          user={{
            id: user.id,
            name: user.name || user.email.split("@")[0],
            email: user.email,
            role: user.role,
            contractType: "STANDARD", // This would come from user profile
            storeName: "Mon Commerce", // This would come from user profile
            avatar: "", // Avatar would be loaded from profile
          }}
          onSidebarToggle={toggleMobileMenu}
          notifications={mockNotifications}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background dark:bg-background">
          <div className="p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
