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
}

interface UseClientContractsReturn {
  contracts: Contract[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useClientContracts(
  options: UseClientContractsOptions = {},
): UseClientContractsReturn {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    setIsLoading(true);
    setError(null);

    // Simuler le chargement
    setTimeout(() => {
      setContracts([]);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    refetch();
  }, [options.status, options.startDate, options.endDate]);

  return {
    contracts,
    isLoading,
    error,
    refetch,
  };
}
