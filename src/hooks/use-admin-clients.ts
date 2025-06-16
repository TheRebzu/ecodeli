import { api } from "@/trpc/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export interface ClientFilters {
  search?: string;
  status?: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "INACTIVE";
  sortBy?: "name" | "email" | "createdAt" | "lastLoginAt";
  sortDirection?: "asc" | "desc";
}

export const useAdminClients = () => {
  const [error, setError] = useState<string | null>(null);

  // Appel tRPC réel pour récupérer les clients
  const {
    data: clientsData,
    isLoading,
    refetch,
  } = api.admin.users.getUsers.useQuery(
    {
      role: "CLIENT",
      includeProfile: true,
    },
    {
      onError: (err: any) => {
        setError(err.message || "Erreur lors du chargement des clients");
      },
    },
  );

  const updateClientStatusMutation = api.admin.users.updateUserStatus.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err: any) => {
      setError(err.message || "Erreur lors de la mise à jour du statut");
    },
  });

  const suspendClientMutation = api.admin.users.suspendUser.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err: any) => {
      setError(err.message || "Erreur lors de la suspension");
    },
  });

  const updateClientStatus = async (clientId: string, status: string) => {
    await updateClientStatusMutation.mutateAsync({ userId: clientId, status  });
  };

  const suspendClient = async (clientId: string, reason: string) => {
    await suspendClientMutation.mutateAsync({ userId: clientId, reason  });
  };

  // Transformer les données pour correspondre à l'interface attendue
  const transformedClients = (clientsData?.users || []).map((user: any) => ({
    id: user.id,
    name: user.profile?.firstName && user.profile?.lastName 
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user.email,
    email: user.email,
    status: user.status,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profileId: user.profile?.id,
    city: user.profile?.address?.city || "Non renseigné",
    phone: user.profile?.phone || "Non renseigné",
    totalOrders: user.profile?.totalOrders || 0,
    totalSpent: user.profile?.totalSpent || 0,
    averageRating: user.profile?.averageRating || 0,
    lastOrderDate: user.profile?.lastOrderDate,
    isVerified: user.emailVerified,
    preferences: user.profile?.preferences || {},
  }));

  return {
    clients: transformedClients,
    isLoading,
    error,
    updateClientStatus,
    suspendClient,
    refetch,
  };
};

export type AdminClient = NonNullable<
  ReturnType<typeof useAdminClients>["clients"][0]
>;
