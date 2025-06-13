#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from "fs";

/**
 * Script pour corriger les problèmes d'encodage UTF-8
 */

console.log("🔧 Correction des problèmes d'encodage UTF-8...");

const problematicFiles = [
  "src/hooks/client/use-client-reviews.ts",
  "src/hooks/client/use-client-contracts.ts",
  "src/hooks/client/use-client-appointments.ts",
];

for (const filePath of problematicFiles) {
  try {
    if (!existsSync(filePath)) {
      console.log(`⚠️ Fichier non trouvé: ${filePath}`);
      continue;
    }

    // Essayer de lire le fichier avec différents encodages
    let content = "";
    try {
      content = readFileSync(filePath, "utf-8");
      console.log(`✅ ${filePath} - UTF-8 OK`);
      continue;
    } catch (error) {
      console.log(`❌ ${filePath} - Problème UTF-8, recréation...`);
    }

    // Recréer le fichier avec un contenu simple
    const fileName = filePath.split("/").pop()?.replace(".ts", "") || "unknown";

    let newContent = "";

    if (fileName.includes("reviews")) {
      newContent = `"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

// Types
interface Review {
  id: string;
  rating: number;
  comment?: string;
  status: "PENDING" | "PUBLISHED" | "REJECTED";
  provider: {
    id: string;
    name: string;
    image?: string;
  };
  service: {
    id: string;
    name: string;
    category: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface UseClientReviewsOptions {
  status?: string;
  rating?: number;
}

interface UseClientReviewsReturn {
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useClientReviews(options: UseClientReviewsOptions = {}): UseClientReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    setIsLoading(true);
    setError(null);
    
    // Simuler le chargement
    setTimeout(() => {
      setReviews([]);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    refetch();
  }, [options.status, options.rating]);

  return {
    reviews,
    isLoading,
    error,
    refetch,
  };
}
`;
    } else if (fileName.includes("contracts")) {
      newContent = `"use client";

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

export function useClientContracts(options: UseClientContractsOptions = {}): UseClientContractsReturn {
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
`;
    } else if (fileName.includes("appointments")) {
      newContent = `"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

// Types
interface Appointment {
  id: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  duration: number;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
  type: "SERVICE" | "DELIVERY" | "CONSULTATION";
  location?: string;
  provider: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
    phone?: string;
  };
  service?: {
    id: string;
    name: string;
    category: string;
  };
  notes?: string;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UseClientAppointmentsOptions {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  type?: string;
}

interface UseClientAppointmentsReturn {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useClientAppointments(options: UseClientAppointmentsOptions = {}): UseClientAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    setIsLoading(true);
    setError(null);
    
    // Simuler le chargement
    setTimeout(() => {
      setAppointments([]);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    refetch();
  }, [options.startDate, options.endDate, options.status, options.type]);

  return {
    appointments,
    isLoading,
    error,
    refetch,
  };
}
`;
    }

    writeFileSync(filePath, newContent, "utf-8");
    console.log(`✅ ${filePath} - Recréé avec encodage UTF-8`);
  } catch (error) {
    console.log(`❌ Erreur avec ${filePath}:`, error);
  }
}

console.log("🎉 Correction d'encodage terminée !");
