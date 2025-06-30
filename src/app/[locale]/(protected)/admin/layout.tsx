"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

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

  return <div>{children}</div>;
}
