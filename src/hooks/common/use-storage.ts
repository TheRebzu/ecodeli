import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import {
  BoxSearchInput,
  BoxReservationCreateInput,
  BoxReservationUpdateInput,
  BoxAvailabilitySubscriptionInput,
} from "@/schemas/storage/storage.schema";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Hook pour la recherche de box disponibles
export const useBoxSearch = () => {
  const { toast } = useToast();
  const t = useTranslations("storage");
  const [searchParams, setSearchParams] = useState<BoxSearchInput | null>(null);

  const {
    data: boxes,
    isLoading,
    error,
    refetch,
  } = api.storage.findAvailableBoxes.useQuery(
    searchParams || {
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours par défaut
    },
    {
      enabled: !!searchParams,
      onError: (error) => {
        toast({
          title: t("search.error"),
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  const searchBoxes = (params: BoxSearchInput) => {
    setSearchParams(params);
  };

  return {
    boxes,
    isLoading,
    error,
    searchBoxes,
    refetch,
    searchParams,
  };
};

// Hook pour la création et la gestion des réservations de box
export const useBoxReservation = () => {
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations("storage");
  const utils = api.useUtils();

  // Mutation pour créer une réservation
  const createReservation = api.storage.createBoxReservation.useMutation({
    onSuccess: () => {
      toast({
        title: t("reservation.success"),
        description: t("reservation.successDescription"),
      });
      // Invalider les queries pour forcer un refresh des données
      utils.storage.getMyBoxReservations.invalidate();
      router.push("/client/storage");
    },
    onError: (error) => {
      toast({
        title: t("reservation.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour mettre à jour une réservation
  const updateReservation = api.storage.updateBoxReservation.useMutation({
    onSuccess: () => {
      toast({
        title: t("reservation.updateSuccess"),
        description: t("reservation.updateSuccessDescription"),
      });
      utils.storage.getMyBoxReservations.invalidate();
    },
    onError: (error) => {
      toast({
        title: t("reservation.updateError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour prolonger une réservation
  const extendReservation = api.storage.extendReservation.useMutation({
    onSuccess: (data) => {
      toast({
        title: t("reservation.extendSuccess"),
        description: t("reservation.extendSuccessDescription", {
          days: data.additionalDays,
          price: data.additionalPrice.toFixed(2),
        }),
      });
      utils.storage.getMyBoxReservations.invalidate();
    },
    onError: (error) => {
      toast({
        title: t("reservation.extendError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour accéder à une box avec code
  const accessBox = api.storage.accessBox.useMutation({
    onSuccess: () => {
      toast({
        title: t("access.success"),
        description: t("access.successDescription"),
      });
      utils.storage.getMyBoxReservations.invalidate();
    },
    onError: (error) => {
      toast({
        title: t("access.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createReservation,
    updateReservation,
    extendReservation,
    accessBox,
  };
};

// Hook pour récupérer les réservations de l'utilisateur courant
export const useBoxReservations = (status?: string) => {
  const { toast } = useToast();
  const t = useTranslations("storage");

  const {
    data: reservations,
    isLoading,
    error,
    refetch,
  } = api.storage.getMyBoxReservations.useQuery(
    status ? { status: status } : {},
    {
      onError: (error) => {
        console.error("Storage API Error:", error);
        toast({
          title: t("reservations.error"),
          description: error.message,
          variant: "destructive",
        });
      },
      onSuccess: (data) => {
        console.log(
          "Storage API Success:",
          data,
          "Type:",
          typeof data,
          "IsArray:",
          Array.isArray(data),
        );
      },
    },
  );

  return {
    reservations,
    isLoading,
    error,
    refetch,
  };
};

// Hook pour récupérer l'historique d'utilisation d'une box
export const useBoxUsageHistory = (boxId: string) => {
  const { toast } = useToast();
  const t = useTranslations("storage");

  const {
    data: history,
    isLoading,
    error,
  } = api.storage.getBoxUsageHistory.useQuery(
    { boxId },
    {
      enabled: !!boxId,
      onError: (error) => {
        toast({
          title: t("history.error"),
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  return {
    history,
    isLoading,
    error,
  };
};

// Hook pour la gestion des abonnements aux notifications de disponibilité
export const useAvailabilitySubscription = (isActive = true) => {
  const { toast } = useToast();
  const t = useTranslations("storage");
  const utils = api.useUtils();

  const getSubscriptions = api.storage.getMySubscriptions.useQuery();

  const createSubscription = api.storage.subscribeToAvailability.useMutation({
    onSuccess: () => {
      toast({
        title: t("subscription.success"),
        description: t("subscription.successDescription"),
      });
      utils.storage.getMySubscriptions.invalidate();
    },
    onError: (err) => {
      toast({
        title: t("subscription.error"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteSubscription = api.storage.deactivateSubscription.useMutation({
    onSuccess: () => {
      toast({
        title: t("subscription.deactivateSuccess"),
        description: t("subscription.deactivateSuccessDescription"),
      });
      utils.storage.getMySubscriptions.invalidate();
    },
    onError: (err) => {
      toast({
        title: t("subscription.deactivateError"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return {
    getSubscriptions,
    createSubscription,
    deleteSubscription,
  };
};

// Hook pour récupérer les entrepôts actifs
export const useWarehouses = () => {
  const { toast } = useToast();
  const t = useTranslations("storage");

  const {
    data: warehouses,
    isLoading,
    error,
  } = api.storage.getActiveWarehouses.useQuery(undefined, {
    onError: (error) => {
      toast({
        title: t("warehouses.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    warehouses,
    isLoading,
    error,
  };
};

// Hook pour récupérer les box d'un entrepôt
export const useWarehouseBoxes = (warehouseId: string) => {
  const { toast } = useToast();
  const t = useTranslations("storage");

  const {
    data: boxes,
    isLoading,
    error,
  } = api.storage.getWarehouseBoxes.useQuery(
    { warehouseId },
    {
      enabled: !!warehouseId,
      onError: (error) => {
        toast({
          title: t("warehouses.boxesError"),
          description: error.message,
          variant: "destructive",
        });
      },
    },
  );

  return {
    boxes,
    isLoading,
    error,
  };
};

// Hook useLocalStorage pour le stockage local
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === "undefined") return initialValue;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}
