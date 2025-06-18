import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/trpc/react";
import { UserRole, DeliveryStatus } from "@prisma/client";

export interface MatchingCriteria {
  // Contraintes géographiques
  maxDistance: number;
  preferredZones?: string[];
  
  // Contraintes temporelles
  preferredTimeSlots?: TimeSlot[];
  maxResponseTime: number; // minutes
  
  // Contraintes de service
  serviceTypes: string[];
  vehicleTypes?: string[];
  experienceLevel?: "BEGINNER" | "INTERMEDIATE" | "EXPERT";
  
  // Contraintes économiques
  minRating?: number;
  maxPrice?: number;
  
  // Préférences
  priorityFactors: PriorityFactor[];
  blacklistedUsers?: string[];
}

export interface TimeSlot {
  dayOfWeek: number; // 0-6
  startHour: number; // 0-23
  endHour: number; // 0-23
}

export interface PriorityFactor {
  factor: "DISTANCE" | "PRICE" | "RATING" | "EXPERIENCE" | "RESPONSE_TIME" | "COMPLETION_RATE";
  weight: number; // 0-1
  direction: "ASC" | "DESC"; // ASC = prefer lower values, DESC = prefer higher values
}

export interface MatchingCandidate {
  id: string;
  userId: string;
  userRole: UserRole;
  name: string;
  avatar?: string;
  
  // Scores de matching
  totalScore: number;
  distanceScore: number;
  priceScore: number;
  ratingScore: number;
  experienceScore: number;
  availabilityScore: number;
  reliabilityScore: number;
  
  // Métriques
  distance: number;
  estimatedPrice: number;
  rating: number;
  completedDeliveries: number;
  completionRate: number;
  averageResponseTime: number;
  
  // Disponibilité
  isAvailable: boolean;
  nextAvailableSlot?: Date;
  estimatedArrival?: Date;
  
  // Détails
  vehicleType?: string;
  experienceLevel: string;
  specialties: string[];
  
  // Calculs détaillés
  breakdown: MatchingBreakdown;
}

export interface MatchingBreakdown {
  distanceWeight: number;
  priceWeight: number;
  ratingWeight: number;
  experienceWeight: number;
  availabilityWeight: number;
  reliabilityWeight: number;
  bonusMalus: number;
  finalScore: number;
}

export interface MatchingRequest {
  serviceType: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  criteria: MatchingCriteria;
  scheduledFor?: Date;
  announcementId?: string;
}

export interface MatchingResult {
  candidates: MatchingCandidate[];
  totalCandidates: number;
  searchRadius: number;
  searchTime: number;
  criteria: MatchingCriteria;
  recommendations: MatchingRecommendation[];
}

export interface MatchingRecommendation {
  type: "EXPAND_RADIUS" | "ADJUST_CRITERIA" | "TRY_LATER" | "ALTERNATIVE_SERVICE";
  message: string;
  action?: string;
}

const DEFAULT_CRITERIA: MatchingCriteria = {
  maxDistance: 15, // km
  maxResponseTime: 10, // minutes
  serviceTypes: ["standard_delivery"],
  priorityFactors: [
    { factor: "DISTANCE", weight: 0.3, direction: "ASC" },
    { factor: "RATING", weight: 0.25, direction: "DESC" },
    { factor: "RESPONSE_TIME", weight: 0.2, direction: "ASC" },
    { factor: "COMPLETION_RATE", weight: 0.15, direction: "DESC" },
    { factor: "PRICE", weight: 0.1, direction: "ASC" },
  ],
};

export const useMatchingSystem = () => {
  const [state, setState] = useState<{
    currentRequest: MatchingRequest | null;
    result: MatchingResult | null;
    isSearching: boolean;
    selectedCandidate: MatchingCandidate | null;
    searchHistory: MatchingRequest[];
  }>({
    currentRequest: null,
    result: null,
    isSearching: false,
    selectedCandidate: null,
    searchHistory: [],
  });

  // Mutations
  const findMatchesMutation = trpc.matching.findMatches.useMutation();
  const selectCandidateMutation = trpc.matching.selectCandidate.useMutation();
  const rejectCandidateMutation = trpc.matching.rejectCandidate.useMutation();

  const findMatches = useCallback(async (request: MatchingRequest) => {
    setState(prev => ({ 
      ...prev, 
      currentRequest: request, 
      isSearching: true,
      result: null,
    }));

    try {
      const result = await findMatchesMutation.mutateAsync(request);
      
      setState(prev => ({
        ...prev,
        result: result as MatchingResult,
        isSearching: false,
        searchHistory: [request, ...prev.searchHistory.slice(0, 9)], // Keep last 10
      }));

      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isSearching: false }));
      throw error;
    }
  }, [findMatchesMutation]);

  const findBestMatch = useCallback(async (request: MatchingRequest): Promise<MatchingCandidate | null> => {
    const result = await findMatches(request);
    return (result as MatchingResult).candidates[0] || null;
  }, [findMatches]);

  const selectCandidate = useCallback(async (candidateId: string, announcementId?: string) => {
    if (!state.currentRequest) return false;

    try {
      await selectCandidateMutation.mutateAsync({
        candidateId,
        announcementId,
        requestData: state.currentRequest,
      });

      const candidate = state.result?.candidates.find(c => c.id === candidateId);
      setState(prev => ({ ...prev, selectedCandidate: candidate || null }));

      return true;
    } catch (error) {
      console.error("Erreur sélection candidat:", error);
      return false;
    }
  }, [state.currentRequest, state.result, selectCandidateMutation]);

  const rejectCandidate = useCallback(async (candidateId: string, reason?: string) => {
    try {
      await rejectCandidateMutation.mutateAsync({
        candidateId,
        reason,
      });

      // Retirer le candidat de la liste
      setState(prev => ({
        ...prev,
        result: prev.result ? {
          ...prev.result,
          candidates: prev.result.candidates.filter(c => c.id !== candidateId),
        } : null,
      }));

      return true;
    } catch (error) {
      console.error("Erreur rejet candidat:", error);
      return false;
    }
  }, [rejectCandidateMutation]);

  const expandSearch = useCallback(async (additionalRadius: number = 5) => {
    if (!state.currentRequest) return;

    const expandedRequest = {
      ...state.currentRequest,
      criteria: {
        ...state.currentRequest.criteria,
        maxDistance: state.currentRequest.criteria.maxDistance + additionalRadius,
      },
    };

    await findMatches(expandedRequest);
  }, [state.currentRequest, findMatches]);

  const adjustCriteria = useCallback(async (newCriteria: Partial<MatchingCriteria>) => {
    if (!state.currentRequest) return;

    const adjustedRequest = {
      ...state.currentRequest,
      criteria: {
        ...state.currentRequest.criteria,
        ...newCriteria,
      },
    };

    await findMatches(adjustedRequest);
  }, [state.currentRequest, findMatches]);

  const findAlternativeMatches = useCallback(async (alternativeServiceTypes: string[]) => {
    if (!state.currentRequest) return;

    const alternativeRequest = {
      ...state.currentRequest,
      criteria: {
        ...state.currentRequest.criteria,
        serviceTypes: alternativeServiceTypes,
      },
    };

    await findMatches(alternativeRequest);
  }, [state.currentRequest, findMatches]);

  const retryWithDefaultCriteria = useCallback(async () => {
    if (!state.currentRequest) return;

    const defaultRequest = {
      ...state.currentRequest,
      criteria: DEFAULT_CRITERIA,
    };

    await findMatches(defaultRequest);
  }, [state.currentRequest, findMatches]);

  // Helper functions
  const getBestCandidates = useCallback((limit: number = 5): MatchingCandidate[] => {
    if (!state.result) return [];
    return state.result.candidates.slice(0, limit);
  }, [state.result]);

  const getCandidatesByDistance = useCallback((maxDistance: number): MatchingCandidate[] => {
    if (!state.result) return [];
    return state.result.candidates.filter(c => c.distance <= maxDistance);
  }, [state.result]);

  const getCandidatesByRating = useCallback((minRating: number): MatchingCandidate[] => {
    if (!state.result) return [];
    return state.result.candidates.filter(c => c.rating >= minRating);
  }, [state.result]);

  const getAvailableCandidates = useCallback((): MatchingCandidate[] => {
    if (!state.result) return [];
    return state.result.candidates.filter(c => c.isAvailable);
  }, [state.result]);

  const getMatchingStats = useCallback(() => {
    if (!state.result) return null;

    const candidates = state.result.candidates;
    if (candidates.length === 0) return null;

    return {
      totalCandidates: candidates.length,
      availableCandidates: candidates.filter(c => c.isAvailable).length,
      averageDistance: candidates.reduce((sum, c) => sum + c.distance, 0) / candidates.length,
      averageRating: candidates.reduce((sum, c) => sum + c.rating, 0) / candidates.length,
      averagePrice: candidates.reduce((sum, c) => sum + c.estimatedPrice, 0) / candidates.length,
      bestScore: Math.max(...candidates.map(c => c.totalScore)),
      worstScore: Math.min(...candidates.map(c => c.totalScore)),
    };
  }, [state.result]);

  const resetSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentRequest: null,
      result: null,
      selectedCandidate: null,
    }));
  }, []);

  const saveSearchCriteria = useCallback((name: string, criteria: MatchingCriteria) => {
    // Sauvegarder en localStorage pour réutilisation
    const savedCriteria = JSON.parse(localStorage.getItem("matching-criteria") || "{}");
    savedCriteria[name] = criteria;
    localStorage.setItem("matching-criteria", JSON.stringify(savedCriteria));
  }, []);

  const loadSearchCriteria = useCallback((name: string): MatchingCriteria | null => {
    try {
      const savedCriteria = JSON.parse(localStorage.getItem("matching-criteria") || "{}");
      return savedCriteria[name] || null;
    } catch {
      return null;
    }
  }, []);

  return {
    // State
    ...state,
    matchingStats: getMatchingStats(),
    
    // Actions
    findMatches,
    findBestMatch,
    selectCandidate,
    rejectCandidate,
    expandSearch,
    adjustCriteria,
    findAlternativeMatches,
    retryWithDefaultCriteria,
    resetSearch,
    
    // Filtering
    getBestCandidates,
    getCandidatesByDistance,
    getCandidatesByRating,
    getAvailableCandidates,
    
    // Persistence
    saveSearchCriteria,
    loadSearchCriteria,
    
    // Loading states
    isSearching: state.isSearching || findMatchesMutation.isLoading,
    isSelecting: selectCandidateMutation.isLoading,
    isRejecting: rejectCandidateMutation.isLoading,
    
    // Default criteria
    DEFAULT_CRITERIA,
  };
};