"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

// Types
interface Contract {
  id: string;
  title: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate: Date;
  endDate?: Date;
  value?: number;
  provider: {
    id: string;
    name: string;
    image?: string;
  };
  client: {
    id: string;
    name: string;
    image?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface UseClientContractsOptions {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface UseClientContractsReturn {
  contracts: Contract[];
  totalContracts: number;
  isLoading: boolean;
  error: string | null;
  signContract: (contractId: string) => Promise<void>;
  downloadContract: (contractId: string) => Promise<void>;
  refetch: () => void;
}

export function useClientContracts(options: UseClientContractsOptions = {}) {
  const [error, setError] = useState<string | null>(null);

  // Appel tRPC réel pour récupérer les contrats
  const {
    data: contractsData,
    isLoading,
    refetch,
  } = api.client.contracts.getClientContracts.useQuery(
    {
      status: options.status,
      page: options.page || 1,
      limit: options.limit || 10,
    },
    {
      onError: (err: any) => {
        setError(err.message || "Erreur lors du chargement des contrats");
      },
    },
  );

  const signContractMutation = api.client.contracts.signContract.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (err: any) => {
      setError(err.message || "Erreur lors de la signature du contrat");
    },
  });

  const downloadContractMutation = api.client.contracts.downloadContract.useMutation({
    onError: (err: any) => {
      setError(err.message || "Erreur lors du téléchargement du contrat");
    },
  });

  const signContract = async (contractId: string) => {
    await signContractMutation.mutateAsync({ contractId  });
  };

  const downloadContract = async (contractId: string) => {
    try {
      const result = await downloadContractMutation.mutateAsync({ contractId  });
      if (result.downloadUrl) {
        window.open(result.downloadUrl, 'blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du téléchargement");
    }
  };

  return {
    contracts: contractsData?.contracts || [],
    totalContracts: contractsData?.total || 0,
    isLoading,
    error,
    signContract,
    downloadContract,
    refetch,
  };
}
