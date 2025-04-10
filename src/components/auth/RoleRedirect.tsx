"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserRole } from "@/lib/auth-utils";

/**
 * Composant client qui gère la redirection basée sur le rôle de l'utilisateur
 * Ce composant doit être placé dans un layout ou une page qui nécessite une redirection basée sur le rôle
 */
export function RoleRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Ne rien faire si la session est en cours de chargement ou si l'utilisateur n'est pas connecté
    if (status === "loading" || !session?.user) return;
    
    // Ne rediriger que si nous sommes sur la page /dashboard
    if (pathname === "/dashboard") {
      const role = session.user.role as unknown as string;
      let redirectPath = "/client/dashboard"; // Valeur par défaut
      
      switch (role) {
        case "CLIENT":
          redirectPath = "/client/dashboard";
          break;
        case "COURIER":
          redirectPath = "/courier/dashboard";
          break;
        case "MERCHANT":
          redirectPath = "/merchant/dashboard";
          break;
        case "PROVIDER":
          redirectPath = "/provider/dashboard";
          break;
        case "ADMIN":
          redirectPath = "/admin/dashboard";
          break;
      }
      
      router.replace(redirectPath);
    }
  }, [session, status, router, pathname]);
  
  // Ce composant ne rend rien visuellement
  return null;
} 