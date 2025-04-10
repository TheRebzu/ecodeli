"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { UserRole } from "@/lib/auth-utils";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Vérifier l'autorisation sans redirection automatique
  useEffect(() => {
    if (!isLoading) {
      // Autorisation accordée si authentifié et rôle correct
      const authorized = isAuthenticated && hasRole(UserRole.CLIENT);
      console.log(`[client-layout] Utilisateur autorisé: ${authorized}`);
      setIsAuthorized(authorized);
    }
  }, [isAuthenticated, isLoading, hasRole]);

  // Afficher un indicateur de chargement si nécessaire
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Toujours afficher le contenu - la logique de redirection est gérée par les pages individuelles
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Le contenu de la page */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-screen-2xl mx-auto">
        {children}
      </main>
    </div>
  );
} 