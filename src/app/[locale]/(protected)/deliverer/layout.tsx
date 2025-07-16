"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DelivererHeader } from "@/components/layout/headers/deliverer-header";
import { DelivererSidebar } from "@/components/layout/sidebars/deliverer-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";

interface DelivererLayoutProps {
  children: React.ReactNode;
}

export default function DelivererLayout({ children }: DelivererLayoutProps) {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Redirect non-validated deliverers to recruitment page, with debug logs
  useEffect(() => {
    if (!isLoading && user && user.role === "DELIVERER") {
      const isValidated = (user.validationStatus === "APPROVED" || user.validationStatus === "VALIDATED") && user.isActive === true;
      const isRecruitmentPage = pathname.includes("/deliverer/recruitment");
      console.log("[DelivererLayout Debug]", {
        user,
        validationStatus: user.validationStatus,
        isActive: user.isActive,
        isValidated,
        pathname,
        isRecruitmentPage
      });
      if (!isValidated && !isRecruitmentPage) {
        console.info("[DelivererLayout] Redirecting deliverer to http://172.21.112.1:3000/fr/deliverer/recruitment", {
          userId: user.id,
          validationStatus: user.validationStatus,
          isActive: user.isActive
        });
        router.replace("/fr/deliverer/recruitment");
      }
      if (isValidated && isRecruitmentPage) {
        console.log("[DelivererLayout Debug] Redirecting to /fr/deliverer because user is validated but on recruitment page.");
        router.replace("/fr/deliverer");
      }
    }
  }, [isLoading, user, pathname, router]);

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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Mock notifications for deliverer
  const mockNotifications = [
    {
      id: "1",
      title: "Nouvelle opportunité",
      message: "Livraison Paris-Lyon compatible avec votre trajet",
      type: "info" as const,
      read: false,
      createdAt: new Date(),
    },
    {
      id: "2",
      title: "Validation requise",
      message: "Document d'assurance à renouveler",
      type: "warning" as const,
      read: false,
      createdAt: new Date(),
    },
    {
      id: "3",
      title: "Livraison confirmée",
      message: "Code de validation: 123456",
      type: "success" as const,
      read: true,
      createdAt: new Date(),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Redirect handled by auth guard
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
        <DelivererSidebar
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
            <DelivererSidebar
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
        <DelivererHeader
          user={{
            id: user.id,
            name: user.name || user.email.split("@")[0],
            email: user.email,
            role: user.role,
            isValidated: (user.validationStatus === "APPROVED" || user.validationStatus === "VALIDATED") && user.isActive === true,
            rating: 4.8, // This would come from user profile
            nfcCardId: "NFC-001", // This would come from user profile
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
