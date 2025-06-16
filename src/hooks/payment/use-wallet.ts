/**
 * Hook personnalisé pour gérer les opérations du portefeuille
 */
import { useCallback, useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
  WalletBalanceInfo,
  Withdrawal,
  Transaction} from "@/types/financial/payment";

interface UseWalletOptions {
  onWithdrawalSuccess?: () => void;
  onWithdrawalError?: (error: Error) => void;
  onConnectSuccess?: () => void;
}

/**
 * Type pour les transactions du portefeuille
 */
export interface WalletTransaction {
  id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description?: string;
  reference?: string;
  createdAt: Date;
}

/**
 * Type pour le solde du portefeuille
 */
export interface WalletBalance {
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
}

/**
 * Type pour les statistiques du portefeuille
 */
export interface WalletStats {
  totalEarnings: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  currentBalance: number;
  pendingBalance: number;
  currency: string;
  transactionCount: number;
  lastTransactionDate?: Date;
}

/**
 * Type pour les options du hook useWalletBalance
 */
interface UseWalletBalanceOptions {
  refreshInterval?: number;
  initialFetch?: boolean;
}

/**
 * Type pour les options du hook useWalletTransactions
 */
interface UseWalletTransactionsOptions {
  initialPage?: number;
  pageSize?: number;
  transactionType?: string;
  refreshInterval?: number;
  initialFetch?: boolean;
}

/**
 * Type pour les options du hook useWithdrawalRequest
 */
interface UseWithdrawalRequestOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  redirectPath?: string;
}

/**
 * Hook pour consulter et gérer le solde du portefeuille
 * @param options Options de configuration
 * @returns Données et fonctions pour manipuler le solde du portefeuille
 */
export function useWalletBalance(options: UseWalletBalanceOptions = {}) {
  const { refreshInterval = 0, initialFetch = true } = options;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Requête pour récupérer le solde
  const {
    data: balanceData,
    isLoading,
    error,
    refetch} = api.wallet.getBalance.useQuery(undefined, {
    enabled: initialFetch,
    refetchInterval: refreshInterval > 0 ? refreshInterval : undefined});

  // Requête pour récupérer les statistiques
  const {
    data: statsData,
    isLoading: isLoadingStats,
    refetch: refetchStats} = api.wallet.getWalletStats.useQuery(undefined, {
    enabled: initialFetch,
    refetchInterval: refreshInterval > 0 ? refreshInterval : undefined});

  /**
   * Rafraîchit manuellement les données du solde
   */
  const refreshBalance = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch();
      await refetchStats();
      return result.data;
    } catch (error) {
      console.error("Erreur lors du rafraîchissement du solde:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du rafraîchissement du solde";

      toast({ variant: "destructive",
        title: "Erreur",
        description: errorMessage });

      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refetchStats]);

  return {
    balance: balanceData,
    stats: statsData,
    isLoading,
    isLoadingStats,
    isRefreshing,
    error,
    refreshBalance};
}

/**
 * Hook pour consulter l'historique des transactions du portefeuille
 * @param options Options de configuration
 * @returns Données et fonctions pour manipuler l'historique des transactions
 */
export function useWalletTransactions(
  options: UseWalletTransactionsOptions = {},
) {
  const {
    initialPage = 1,
    pageSize = 10,
    transactionType,
    refreshInterval = 0,
    initialFetch = true} = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [currentLimit, setCurrentLimit] = useState(pageSize);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<{
    type?: string;
    startDate?: Date;
    endDate?: Date;
    sortOrder?: "asc" | "desc";
  }>({ type: transactionType,
    sortOrder: "desc" });

  // Requête pour récupérer les transactions
  const { data, isLoading, error, refetch } =
    api.wallet.getTransactionHistory.useQuery(
      {
        page: currentPage,
        limit: currentLimit,
        type: filters.type as any,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sortOrder: filters.sortOrder},
      {
        enabled: initialFetch,
        refetchInterval: refreshInterval > 0 ? refreshInterval : undefined},
    );

  /**
   * Rafraîchit les transactions
   */
  const refreshTransactions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refetch();
      return result.data;
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des transactions:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du rafraîchissement des transactions";

      toast({ variant: "destructive",
        title: "Erreur",
        description: errorMessage });

      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  /**
   * Change de page
   */
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  /**
   * Change la taille de la page
   */
  const setPageSize = useCallback((size: number) => {
    setCurrentLimit(size);
    setCurrentPage(1); // Retour à la première page lors du changement de taille
  }, []);

  /**
   * Filtre les transactions
   */
  const filterTransactions = useCallback(
    (newFilters: {
      type?: string;
      startDate?: Date;
      endDate?: Date;
      sortOrder?: "asc" | "desc";
    }) => {
      setFilters((prev) => ({ ...prev, ...newFilters  }));
      setCurrentPage(1); // Retour à la première page lors du filtrage
    },
    [],
  );

  /**
   * Exporte les transactions au format CSV
   */
  const exportTransactions = useCallback(async () => {
    try {
      const exportMutation = api.wallet.exportTransactions.useMutation();
      const result = await exportMutation.mutateAsync({
        format: "CSV",
        filters: {
          type: filters.type,
          startDate: filters.startDate,
          endDate: filters.endDate}});

      if (result.downloadUrl) {
        // Déclencher le téléchargement
        const link = document.createElement("a");
        link.href = result.downloadUrl;
        link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Export réussi",
          description: "Vos transactions ont été exportées avec succès" });

        return true;
      }

      return false;
    } catch (error) {
      console.error("Erreur lors de l'export des transactions:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'export des transactions";

      toast({ variant: "destructive",
        title: "Erreur d'export",
        description: errorMessage });

      return false;
    }
  }, [filters]);

  return {
    transactions: data?.transactions || [],
    pagination: data?.pagination || {
      total: 0,
      page: currentPage,
      limit: currentLimit,
      totalPages: 0},
    isLoading,
    isRefreshing,
    error,
    filters,
    currentPage,
    pageSize: currentLimit,
    refreshTransactions,
    goToPage,
    setPageSize,
    filterTransactions,
    exportTransactions};
}

/**
 * Hook pour gérer les demandes de retrait
 * @param options Options de configuration
 * @returns Fonctions et états pour gérer les demandes de retrait
 */
export function useWithdrawalRequest(
  options: UseWithdrawalRequestOptions = {},
) {
  const { onSuccess, onError, redirectPath } = options;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);

  // Récupérer les retraits en cours
  const {
    data: withdrawalsData,
    isLoading: isLoadingWithdrawals,
    refetch: refetchWithdrawals} = api.wallet.getWithdrawals.useQuery(
    { page: 1, limit: 10 },
    { enabled },
  );

  // Récupérer le statut du compte bancaire
  const {
    data: bankAccountStatus,
    isLoading: isCheckingBankAccount,
    refetch: refetchBankAccountStatus} = api.wallet.checkBankAccountStatus.useQuery(undefined, { enabled });

  // Mutation pour créer une demande de retrait
  const withdrawalMutation = api.wallet.createWithdrawalRequest.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Demande de retrait soumise",
        description: `Votre demande de retrait de ${data.amount} ${data.currency} a été soumise avec succès`});

      if (onSuccess) {
        onSuccess(data);
      }

      if (redirectPath) {
        router.push(redirectPath);
      }
    },
    onError: (error) => {
      const errorMessage =
        error.message ||
        "Une erreur est survenue lors de la demande de retrait";
      setWithdrawalError(errorMessage);

      toast({ variant: "destructive",
        title: "Erreur de retrait",
        description: errorMessage });

      if (onError) {
        onError(error as Error);
      }
    }});

  // Mutation pour annuler une demande de retrait
  const cancelWithdrawalMutation = api.wallet.cancelWithdrawal.useMutation({ onSuccess: (data) => {
      toast({
        title: "Retrait annulé",
        description: "Votre demande de retrait a été annulée avec succès" });

      // Rafraîchir la liste des retraits
      refetchWithdrawals();
    },
    onError: (error) => {
      const errorMessage =
        error.message ||
        "Une erreur est survenue lors de l'annulation du retrait";

      toast({ variant: "destructive",
        title: "Erreur d'annulation",
        description: errorMessage });
    }});

  /**
   * Soumet une demande de retrait
   */
  const submitWithdrawal = useCallback(
    async (amount: number, currency: string = "EUR") => {
      setIsSubmitting(true);
      setWithdrawalError(null);

      try {
        await withdrawalMutation.mutateAsync({ amount, currency  });
        await refetchWithdrawals();
        return true;
      } catch (error) {
        // L'erreur est déjà gérée par onError de la mutation
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [withdrawalMutation, refetchWithdrawals],
  );

  /**
   * Annule une demande de retrait
   */
  const cancelWithdrawal = useCallback(
    async (withdrawalId: string) => {
      try {
        await cancelWithdrawalMutation.mutateAsync({ withdrawalId  });
        return true;
      } catch (error) {
        // L'erreur est déjà gérée par onError de la mutation
        return false;
      }
    },
    [cancelWithdrawalMutation],
  );

  /**
   * Vérifie si une demande de retrait peut être soumise
   */
  const canRequestWithdrawal = useCallback(
    (
      amount: number,
    ): {
      canRequest: boolean;
      reason?: string;
    } => {
      // Vérifier si le compte bancaire est configuré
      if (!bankAccountStatus?.isValid) {
        return {
          canRequest: false,
          reason:
            "Vous devez configurer vos informations bancaires avant de pouvoir demander un retrait"};
      }

      // Vérifier s'il y a des demandes en cours
      const hasPendingWithdrawals = withdrawalsData?.withdrawals.some(
        (w) => w.status === "PENDING",
      );
      if (hasPendingWithdrawals) {
        return {
          canRequest: false,
          reason: "Vous avez déjà une demande de retrait en cours"};
      }

      // Vérifier le solde disponible
      const availableBalance = withdrawalsData?.balance?.availableBalance || 0;
      if (amount > availableBalance) {
        return {
          canRequest: false,
          reason: `Le montant demandé (${amount} €) est supérieur à votre solde disponible (${availableBalance} €)`};
      }

      // Vérifier le montant minimum
      const minimumAmount = withdrawalsData?.minimumWithdrawal || 10;
      if (amount < minimumAmount) {
        return {
          canRequest: false,
          reason: `Le montant minimum pour un retrait est de ${minimumAmount} €`};
      }

      return { canRequest };
    },
    [bankAccountStatus, withdrawalsData],
  );

  /**
   * Calcule l'estimation de la date d'arrivée du retrait
   */
  const getEstimatedArrivalDate = useCallback(
    (withdrawalDate: Date = new Date()): Date => {
      // Par défaut, estimation de 2-3 jours ouvrables
      const estimatedDate = new Date(withdrawalDate);
      estimatedDate.setDate(estimatedDate.getDate() + 3);

      // Ajuster si c'est un week-end
      const day = estimatedDate.getDay();
      if (day === 0) {
        // Dimanche
        estimatedDate.setDate(estimatedDate.getDate() + 1);
      } else if (day === 6) {
        // Samedi
        estimatedDate.setDate(estimatedDate.getDate() + 2);
      }

      return estimatedDate;
    },
    [],
  );

  return {
    withdrawals: withdrawalsData?.withdrawals || [],
    balance: withdrawalsData?.balance,
    minimumWithdrawal: withdrawalsData?.minimumWithdrawal || 10,
    bankAccountStatus,
    isSubmitting,
    isLoadingWithdrawals,
    isCheckingBankAccount,
    withdrawalError,
    submitWithdrawal,
    cancelWithdrawal,
    canRequestWithdrawal,
    getEstimatedArrivalDate,
    refetchWithdrawals,
    refetchBankAccountStatus};
}

/**
 * Hook principal pour gérer les opérations du portefeuille (compatible avec l'existant)
 */
export function useWallet(options: UseWalletOptions = {}) {
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();
  const [isLoading, setIsLoading] = useState(false);

  // Obtenir l'équilibre du portefeuille
  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    refetch: refetchBalance} = api.wallet.getMyBalance.useQuery();

  // Obtenir les transactions
  const getTransactions = (page: number = 1, limit: number = 10) => {
    return api.wallet.getTransactionHistory.useQuery({ page, limit  });
  };

  // Obtenir les demandes de virement
  const getWithdrawals = (page: number = 1, limit: number = 10) => {
    return api.wallet.getWithdrawals.useQuery({ page, limit  });
  };

  // Mutation pour créer une demande de virement
  const createWithdrawal = api.wallet.createWithdrawalRequest.useMutation({ onSuccess: () => {
      toast({
        title: "Demande de virement soumise",
        variant: "success" });

      // Rafraîchir les données manuellement
      refetchWithdrawals();
      refetchBalance();

      if (options.onWithdrawalSuccess) {
        options.onWithdrawalSuccess();
      }
    },
    onError: (error) => {
      toast({ title: "Erreur: " + error.message,
        variant: "destructive" });

      if (options.onWithdrawalError) {
        options.onWithdrawalError(error as unknown as Error);
      }
    }});

  // Mutation pour annuler une demande de virement
  const cancelWithdrawal = api.wallet.cancelWithdrawal.useMutation({ onSuccess: () => {
      toast({
        title: "Demande annulée",
        variant: "success" });

      // Rafraîchir les données manuellement
      refetchWithdrawals();
      refetchBalance();
    },
    onError: (error) => {
      toast({ title: "Erreur: " + error.message,
        variant: "destructive" });
    }});

  // Variables de refetch pour les données
  const { refetch } = api.wallet.getWithdrawals.useQuery(
    { page: 1, limit: 10 },
    { enabled },
  );

  // Statut du compte Connect
  const {
    data: connectStatus,
    isLoading: isCheckingAccount,
    refetch: refetchConnectStatus} = api.wallet.getConnectAccountStatus.useQuery();

  // Créer une demande de virement
  const submitWithdrawal = useCallback(
    (amount: number) => {
      createWithdrawal.mutate({ amount, currency: "EUR"  });
    },
    [createWithdrawal],
  );

  // Annuler une demande de virement
  const cancelWithdrawalRequest = useCallback(
    (withdrawalId: string) => {
      cancelWithdrawal.mutate({ withdrawalId  });
    },
    [cancelWithdrawal],
  );

  // Requêtes tRPC
  const walletQuery = api.wallet.getWallet.useQuery(undefined, { enabled });
  const balanceQuery = api.wallet.getBalance.useQuery(undefined, { enabled });
  const transactionHistoryQuery = api.wallet.getTransactionHistory.useQuery(
    { page: 1, limit: 10 },
    { enabled },
  );
  const walletStatsQuery = api.wallet.getWalletStats.useQuery(undefined, { enabled });
  const createConnectAccountMutation =
    api.wallet.createConnectAccount.useMutation();
  const generateOnboardingLinkMutation =
    api.wallet.generateOnboardingLink.useMutation();
  const checkConnectAccountStatusQuery =
    api.wallet.checkConnectAccountStatus.useQuery(undefined, { enabled });

  /**
   * Récupère les détails du portefeuille
   */
  const getWallet = useCallback(async () => {
    try {
      const result = await walletQuery.refetch();
      return result.data || null;
    } catch (error) {
      console.error("Erreur lors de la récupération du portefeuille:", error);
      toast({ variant: "destructive",
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la récupération du portefeuille" });
      return null;
    }
  }, [walletQuery]);

  /**
   * Récupère le solde du portefeuille
   */
  const getBalance = useCallback(async () => {
    try {
      const result = await balanceQuery.refetch();
      return (
        result.data || {
          balance: 0,
          availableBalance: 0,
          pendingBalance: 0,
          currency: "EUR"}
      );
    } catch (error) {
      console.error("Erreur lors de la récupération du solde:", error);
      toast({ variant: "destructive",
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la récupération du solde" });
      return {
        balance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        currency: "EUR"};
    }
  }, [balanceQuery]);

  /**
   * Récupère l'historique des transactions
   */
  const getTransactionHistory = useCallback(
    async (page: number = 1, limit: number = 10) => {
      try {
        const result = await transactionHistoryQuery.refetch({ page, limit  });
        return (
          result.data || {
            transactions: [],
            pagination: { total: 0, page, limit, totalPages: 0 }}
        );
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de l'historique des transactions:",
          error,
        );
        toast({ variant: "destructive",
          title: "Erreur",
          description:
            error instanceof Error
              ? error.message
              : "Une erreur est survenue lors de la récupération de l'historique" });
        return {
          transactions: [],
          pagination: { total: 0, page, limit, totalPages: 0 }};
      }
    },
    [transactionHistoryQuery],
  );

  /**
   * Récupère les statistiques du portefeuille
   */
  const getWalletStats = useCallback(async () => {
    try {
      const result = await walletStatsQuery.refetch();
      return (
        result.data || {
          totalEarnings: 0,
          totalWithdrawals: 0,
          pendingWithdrawals: 0,
          currentBalance: 0,
          pendingBalance: 0,
          currency: "EUR",
          transactionCount: 0}
      );
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      toast({ variant: "destructive",
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la récupération des statistiques" });
      return {
        totalEarnings: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        currentBalance: 0,
        pendingBalance: 0,
        currency: "EUR",
        transactionCount: 0};
    }
  }, [walletStatsQuery]);

  /**
   * Crée un compte Stripe Connect
   */
  const createConnectAccount = useCallback(
    async (country: string = "FR") => {
      setIsLoading(true);
      try {
        const result = await createConnectAccountMutation.mutateAsync({ country });

        // Actualiser l'état du portefeuille
        await walletQuery.refetch();

        return result;
      } catch (error) {
        console.error(
          "Erreur lors de la création du compte Stripe Connect:",
          error,
        );
        toast({ variant: "destructive",
          title: "Erreur",
          description:
            error instanceof Error
              ? error.message
              : "Une erreur est survenue lors de la création du compte" });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [createConnectAccountMutation, walletQuery],
  );

  /**
   * Génère un lien d'onboarding pour le compte Stripe Connect
   */
  const generateOnboardingLink = useCallback(
    async (returnUrl: string) => {
      setIsLoading(true);
      try {
        const result = await generateOnboardingLinkMutation.mutateAsync({ returnUrl });
        return result;
      } catch (error) {
        console.error(
          "Erreur lors de la génération du lien d'onboarding:",
          error,
        );
        toast({ variant: "destructive",
          title: "Erreur",
          description:
            error instanceof Error
              ? error.message
              : "Une erreur est survenue lors de la génération du lien" });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [generateOnboardingLinkMutation],
  );

  /**
   * Vérifie l'état de vérification du compte Stripe Connect
   */
  const checkConnectAccountStatus = useCallback(async () => {
    try {
      const result = await checkConnectAccountStatusQuery.refetch();
      return (
        result.data || {
          isVerified: false,
          stripeAccountId: null,
          success: true}
      );
    } catch (error) {
      console.error(
        "Erreur lors de la vérification du compte Stripe Connect:",
        error,
      );
      toast({ variant: "destructive",
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la vérification du compte" });
      return { isVerified: false, stripeAccountId: null, success: false };
    }
  }, [checkConnectAccountStatusQuery]);

  return {
    // États
    balance: balanceData,
    isLoadingBalance,
    isCreatingWithdrawal: createWithdrawal.isPending,
    isCancellingWithdrawal: cancelWithdrawal.isPending,
    connectStatus,
    isCheckingAccount,

    // Actions
    getTransactions,
    getWithdrawals,
    submitWithdrawal,
    cancelWithdrawalRequest,

    // Rafraîchir les données
    refetchBalance,
    refetchWithdrawals,
    refetchConnectStatus,

    isLoading,
    getWallet,
    getBalance,
    getTransactionHistory,
    getWalletStats,
    createConnectAccount,
    generateOnboardingLink,
    checkConnectAccountStatus};
}
