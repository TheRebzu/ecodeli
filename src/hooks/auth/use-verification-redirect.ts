import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/auth/use-auth";
import { UserRole } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

/**
 * Hook pour gérer les redirections liées à la vérification d'utilisateur
 *
 * Ce hook surveille le statut de vérification de l'utilisateur et redirige
 * vers les pages appropriées en fonction du rôle et de l'état de vérification.
 *
 * @param options Options de configuration du hook
 */
export function useVerificationRedirect(
  options: {
    requireVerified?: boolean;
    allowedRoles?: UserRole[];
    redirectTo?: string;
    showToast?: boolean;
    locale: string;
  } = {},
) {
  const {
    requireVerified = true,
    allowedRoles = [],
    redirectTo,
    showToast = true,
    locale,
  } = options;

  const { user, role, status, isVerified, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session } = useSession();

  const verificationRequired =
    searchParams.get("verification_required") === "true";

  const { data: verificationStatus } =
    api.verification.getUserVerificationStatus.useQuery(undefined, {
      enabled: !!session?.user?.id,
      staleTime: 60 * 1000,
    });

  useEffect(() => {
    // Ne rien faire pendant le chargement
    if (status === "loading" || isLoading) return;

    // Rediriger vers la connexion si non connecté
    if (status === "unauthenticated") {
      router.push(
        `/${locale}/login?callbackUrl=${encodeURIComponent(window.location.href)}`,
      );
      return;
    }

    if (status === "authenticated" && session?.user) {
      // Pas besoin de vérification pour les clients ou les admins
      if (
        session.user.role === UserRole.CLIENT ||
        session.user.role === UserRole.ADMIN
      ) {
        return;
      }

      // Vérifier si l'utilisateur est vérifié et rediriger si nécessaire
      if (
        requireVerified &&
        verificationStatus &&
        !verificationStatus.isVerified
      ) {
        router.push(`/${locale}/${session.user.role.toLowerCase()}/profile`);
      }
    }
  }, [
    status,
    isLoading,
    session,
    verificationStatus,
    router,
    requireVerified,
    locale,
  ]);

  return {
    isLoading: status === "loading" || isLoading,
    verificationStatus,
    isVerified: verificationStatus?.isVerified,
  };
}

/**
 * Récupère le chemin du dashboard en fonction du rôle
 */
function getDashboardPathByRole(role: UserRole): string {
  switch (role) {
    case UserRole.CLIENT:
      return "/client";
    case UserRole.DELIVERER:
      return "/deliverer";
    case UserRole.MERCHANT:
      return "/merchant";
    case UserRole.PROVIDER:
      return "/provider";
    case UserRole.ADMIN:
      return "/admin";
    default:
      return "/";
  }
}

/**
 * Récupère le chemin de vérification en fonction du rôle
 */
function getVerificationPathByRole(role: UserRole): string {
  switch (role) {
    case UserRole.DELIVERER:
      return "/deliverer/documents";
    case UserRole.MERCHANT:
      return "/merchant/documents";
    case UserRole.PROVIDER:
      return "/provider/documents";
    default:
      return "/";
  }
}
