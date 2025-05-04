/**
 * Hook personnalisé pour gérer les opérations du portefeuille
 */
import { useCallback, useState } from 'react';
import { trpc } from '@/trpc/client';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { WalletBalanceInfo, Withdrawal, Transaction } from '@/types/payment';

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

export function useWallet(options: UseWalletOptions = {}) {
  const { toast } = useToast();
  const router = useRouter();
  const utils = api.useUtils();
  const [isLoading, setIsLoading] = useState(false);

  // Obtenir l'équilibre du portefeuille
  const { 
    data: balanceData, 
    isLoading: isLoadingBalance,
    refetch: refetchBalance
  } = api.wallet.getMyBalance.useQuery();

  // Obtenir les transactions
  const getTransactions = (page: number = 1, limit: number = 10) => {
    return api.wallet.getTransactionHistory.useQuery({ page, limit });
  };

  // Obtenir les demandes de virement
  const getWithdrawals = (page: number = 1, limit: number = 10) => {
    return api.wallet.getWithdrawals.useQuery({ page, limit });
  };

  // Mutation pour créer une demande de virement
  const createWithdrawal = api.wallet.createWithdrawalRequest.useMutation({
    onSuccess: () => {
      toast({
        title: 'Demande de virement soumise',
        variant: 'success',
      });
      
      // Rafraîchir les données manuellement
      refetchWithdrawals();
      refetchBalance();
      
      if (options.onWithdrawalSuccess) {
        options.onWithdrawalSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: 'Erreur: ' + error.message,
        variant: 'destructive',
      });
      
      if (options.onWithdrawalError) {
        options.onWithdrawalError(error as unknown as Error);
      }
    }
  });

  // Mutation pour annuler une demande de virement
  const cancelWithdrawal = api.wallet.cancelWithdrawal.useMutation({
    onSuccess: () => {
      toast({
        title: 'Demande annulée',
        variant: 'success',
      });
      
      // Rafraîchir les données manuellement
      refetchWithdrawals();
      refetchBalance();
    },
    onError: (error) => {
      toast({
        title: 'Erreur: ' + error.message,
        variant: 'destructive',
      });
    }
  });

  // Variables de refetch pour les données
  const { refetch: refetchWithdrawals } = api.wallet.getWithdrawals.useQuery(
    { page: 1, limit: 10 },
    { enabled: false }
  );

  // Statut du compte Connect
  const { 
    data: connectStatus, 
    isLoading: isCheckingAccount,
    refetch: refetchConnectStatus
  } = api.wallet.getConnectAccountStatus.useQuery();

  // Créer une demande de virement
  const submitWithdrawal = useCallback((amount: number) => {
    createWithdrawal.mutate({ amount, currency: "EUR" });
  }, [createWithdrawal]);

  // Annuler une demande de virement
  const cancelWithdrawalRequest = useCallback((withdrawalId: string) => {
    cancelWithdrawal.mutate({ withdrawalId });
  }, [cancelWithdrawal]);

  // Requêtes tRPC
  const walletQuery = trpc.wallet.getWallet.useQuery(undefined, {
    enabled: false
  });
  const balanceQuery = trpc.wallet.getBalance.useQuery(undefined, {
    enabled: false
  });
  const transactionHistoryQuery = trpc.wallet.getTransactionHistory.useQuery(
    { page: 1, limit: 10 },
    { enabled: false }
  );
  const walletStatsQuery = trpc.wallet.getWalletStats.useQuery(undefined, {
    enabled: false
  });
  const createConnectAccountMutation = trpc.wallet.createConnectAccount.useMutation();
  const generateOnboardingLinkMutation = trpc.wallet.generateOnboardingLink.useMutation();
  const checkConnectAccountStatusQuery = trpc.wallet.checkConnectAccountStatus.useQuery(
    undefined,
    { enabled: false }
  );

  /**
   * Récupère les détails du portefeuille
   */
  const getWallet = useCallback(async () => {
    try {
      const result = await walletQuery.refetch();
      return result.data || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du portefeuille:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la récupération du portefeuille'
      });
      return null;
    }
  }, [walletQuery]);

  /**
   * Récupère le solde du portefeuille
   */
  const getBalance = useCallback(async () => {
    try {
      const result = await balanceQuery.refetch();
      return result.data || {
        balance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        currency: 'EUR'
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la récupération du solde'
      });
      return {
        balance: 0,
        availableBalance: 0,
        pendingBalance: 0,
        currency: 'EUR'
      };
    }
  }, [balanceQuery]);

  /**
   * Récupère l'historique des transactions
   */
  const getTransactionHistory = useCallback(
    async (page: number = 1, limit: number = 10) => {
      try {
        const result = await transactionHistoryQuery.refetch({ page, limit });
        return result.data || { transactions: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des transactions:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la récupération de l\'historique'
        });
        return { transactions: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
    },
    [transactionHistoryQuery]
  );

  /**
   * Récupère les statistiques du portefeuille
   */
  const getWalletStats = useCallback(async () => {
    try {
      const result = await walletStatsQuery.refetch();
      return result.data || {
        totalEarnings: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        currentBalance: 0,
        pendingBalance: 0,
        currency: 'EUR',
        transactionCount: 0
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la récupération des statistiques'
      });
      return {
        totalEarnings: 0,
        totalWithdrawals: 0,
        pendingWithdrawals: 0,
        currentBalance: 0,
        pendingBalance: 0,
        currency: 'EUR',
        transactionCount: 0
      };
    }
  }, [walletStatsQuery]);

  /**
   * Crée un compte Stripe Connect
   */
  const createConnectAccount = useCallback(
    async (country: string = 'FR') => {
      setIsLoading(true);
      try {
        const result = await createConnectAccountMutation.mutateAsync({ country });
        
        // Actualiser l'état du portefeuille
        await walletQuery.refetch();
        
        return result;
      } catch (error) {
        console.error('Erreur lors de la création du compte Stripe Connect:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la création du compte'
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [createConnectAccountMutation, walletQuery]
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
        console.error('Erreur lors de la génération du lien d\'onboarding:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération du lien'
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [generateOnboardingLinkMutation]
  );

  /**
   * Vérifie l'état de vérification du compte Stripe Connect
   */
  const checkConnectAccountStatus = useCallback(async () => {
    try {
      const result = await checkConnectAccountStatusQuery.refetch();
      return result.data || { isVerified: false, stripeAccountId: null, success: true };
    } catch (error) {
      console.error('Erreur lors de la vérification du compte Stripe Connect:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la vérification du compte'
      });
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
    checkConnectAccountStatus
  };
} 