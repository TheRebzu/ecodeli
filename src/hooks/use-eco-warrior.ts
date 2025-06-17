"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ecoWarriorService, 
  type EcoStats, 
  type EcoAction, 
  type EcoBadge, 
  EcoActionType 
} from "@/services/eco-warrior.service";
import { toast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

export function useEcoWarrior() {
  const { data: session } = useSession();
  const [ecoStats, setEcoStats] = useState<EcoStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les statistiques éco
  const loadEcoStats = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const stats = await ecoWarriorService.getUserEcoStats(session.user.id);
      setEcoStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors du chargement des stats éco";
      setError(errorMessage);
      console.error("Erreur lors du chargement des stats éco:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Enregistrer une action éco-responsable
  const recordAction = useCallback(async (
    actionType: EcoActionType,
    metadata?: Record<string, any>
  ) => {
    if (!session?.user?.id) {
      console.warn("Utilisateur non connecté, impossible d'enregistrer l'action");
      return null;
    }

    try {
      const result = await ecoWarriorService.recordEcoAction(
        session.user.id,
        actionType,
        metadata
      );

      // Mettre à jour les stats locales
      await loadEcoStats();

      // Afficher les notifications pour les récompenses
      if (result.levelUp) {
        toast({
          title: "🎉 Niveau supérieur atteint !",
          description: `Vous êtes maintenant ${ecoStats?.currentLevel.name || 'niveau supérieur'} !`,
          duration: 5000,
        });
      }

      if (result.newBadges.length > 0) {
        result.newBadges.forEach(badge => {
          toast({
            title: `🏆 Nouveau badge débloqué !`,
            description: `${badge.icon} ${badge.name}: ${badge.description}`,
            duration: 5000,
          });
        });
      }

      // Toujours afficher les points gagnés
      toast({
        title: "✨ Points éco gagnés !",
        description: `+${result.action.points} points pour "${result.action.description}"`,
        duration: 3000,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'action";
      setError(errorMessage);
      toast({
        title: "❌ Erreur",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      return null;
    }
  }, [session?.user?.id, loadEcoStats, ecoStats?.currentLevel.name]);

  // Calculer l'impact environnemental
  const calculateImpact = useCallback((co2SavedGrams: number) => {
    return ecoWarriorService.calculateEnvironmentalImpact(co2SavedGrams);
  }, []);

  // Obtenir le classement
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const loadLeaderboard = useCallback(async (timeframe: "WEEKLY" | "MONTHLY" | "ALL_TIME" = "MONTHLY") => {
    try {
      setLeaderboardLoading(true);
      const ranking = await ecoWarriorService.getLeaderboard(timeframe);
      setLeaderboard(ranking);
    } catch (err) {
      console.error("Erreur lors du chargement du classement:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // Charger les données au montage
  useEffect(() => {
    if (session?.user?.id) {
      loadEcoStats();
      loadLeaderboard();
    }
  }, [session?.user?.id, loadEcoStats, loadLeaderboard]);

  // Calculer les métriques dérivées
  const metrics = ecoStats ? {
    progressToNextLevel: ecoStats.nextLevel 
      ? ((ecoStats.totalPoints - ecoStats.currentLevel.minPoints) / 
         (ecoStats.nextLevel.minPoints - ecoStats.currentLevel.minPoints)) * 100
      : 100,
    co2SavedKg: ecoStats.co2SavedTotal / 1000,
    co2SavedThisMonthKg: ecoStats.co2SavedThisMonth / 1000,
    environmentalImpact: calculateImpact(ecoStats.co2SavedTotal),
    badgesUnlocked: ecoStats.badges.filter(b => b.unlockedAt).length,
    badgesInProgress: ecoStats.badges.filter(b => !b.unlockedAt && (b.progress || 0) > 0).length
  } : null;

  return {
    // État
    ecoStats,
    metrics,
    leaderboard,
    isLoading,
    leaderboardLoading,
    error,

    // Actions
    recordAction,
    loadEcoStats,
    loadLeaderboard,
    calculateImpact,

    // Utilitaires
    isEcoWarrior: (ecoStats?.currentLevel.level || 0) >= 3,
    canEarnPoints: !!session?.user?.id,
  };
}

// Hook spécialisé pour les livreurs
export function useDelivererEco() {
  const ecoWarrior = useEcoWarrior();

  // Actions spécifiques aux livreurs
  const recordDeliveryAction = useCallback(async (deliveryData: {
    isOnTime: boolean;
    isEarly: boolean;
    transportMode: "BIKE" | "ELECTRIC" | "WALKING" | "CAR";
    packagingType: "REUSABLE" | "MINIMAL" | "RECYCLED" | "STANDARD";
    routeOptimized: boolean;
  }) => {
    const actions: EcoActionType[] = [EcoActionType.DELIVERY_COMPLETED];

    // Ajouter des actions basées sur les critères
    if (deliveryData.isEarly) {
      actions.push(EcoActionType.DELIVERY_EARLY);
    } else if (deliveryData.isOnTime) {
      actions.push(EcoActionType.DELIVERY_ON_TIME);
    }

    // Transport éco-responsable
    switch (deliveryData.transportMode) {
      case "BIKE":
        actions.push(EcoActionType.BIKE_DELIVERY);
        break;
      case "ELECTRIC":
        actions.push(EcoActionType.ELECTRIC_VEHICLE);
        break;
      case "WALKING":
        actions.push(EcoActionType.WALKING_DELIVERY);
        break;
    }

    // Type d'emballage
    switch (deliveryData.packagingType) {
      case "REUSABLE":
        actions.push(EcoActionType.REUSABLE_PACKAGING);
        break;
      case "MINIMAL":
        actions.push(EcoActionType.MINIMAL_PACKAGING);
        break;
      case "RECYCLED":
        actions.push(EcoActionType.RECYCLED_PACKAGING);
        break;
    }

    // Route optimisée
    if (deliveryData.routeOptimized) {
      actions.push(EcoActionType.ECO_FRIENDLY_ROUTE);
    }

    // Enregistrer toutes les actions
    const results = [];
    for (const action of actions) {
      const result = await ecoWarrior.recordAction(action, deliveryData);
      if (result) results.push(result);
    }

    return results;
  }, [ecoWarrior]);

  return {
    ...ecoWarrior,
    recordDeliveryAction,
  };
}

// Hook spécialisé pour les clients
export function useClientEco() {
  const ecoWarrior = useEcoWarrior();

  // Actions spécifiques aux clients
  const recordPurchaseAction = useCallback(async (purchaseData: {
    isLocal: boolean;
    isOrganic: boolean;
    isSeasonal: boolean;
    isBulk: boolean;
    packagingType: "NO_PLASTIC" | "REUSABLE" | "MINIMAL" | "STANDARD";
  }) => {
    const actions: EcoActionType[] = [];

    // Type d'achat
    if (purchaseData.isLocal) actions.push(EcoActionType.LOCAL_PURCHASE);
    if (purchaseData.isOrganic) actions.push(EcoActionType.ORGANIC_PURCHASE);
    if (purchaseData.isSeasonal) actions.push(EcoActionType.SEASONAL_PURCHASE);
    if (purchaseData.isBulk) actions.push(EcoActionType.BULK_PURCHASE);

    // Type d'emballage
    if (purchaseData.packagingType === "NO_PLASTIC") {
      actions.push(EcoActionType.NO_PLASTIC_PACKAGING);
    }

    // Enregistrer toutes les actions
    const results = [];
    for (const action of actions) {
      const result = await ecoWarrior.recordAction(action, purchaseData);
      if (result) results.push(result);
    }

    return results;
  }, [ecoWarrior]);

  const recordFeedback = useCallback(async () => {
    return ecoWarrior.recordAction(EcoActionType.FEEDBACK_PROVIDED);
  }, [ecoWarrior]);

  const recordReferral = useCallback(async () => {
    return ecoWarrior.recordAction(EcoActionType.REFERRAL);
  }, [ecoWarrior]);

  return {
    ...ecoWarrior,
    recordPurchaseAction,
    recordFeedback,
    recordReferral,
  };
}

// Hook spécialisé pour les prestataires
export function useProviderEco() {
  const ecoWarrior = useEcoWarrior();

  // Actions spécifiques aux prestataires
  const recordServiceAction = useCallback(async (serviceData: {
    isEcoFriendly: boolean;
    isGreenCleaning: boolean;
    isEnergyEfficient: boolean;
  }) => {
    const actions: EcoActionType[] = [];

    if (serviceData.isEcoFriendly) actions.push(EcoActionType.SERVICE_ECO_FRIENDLY);
    if (serviceData.isGreenCleaning) actions.push(EcoActionType.GREEN_CLEANING);
    if (serviceData.isEnergyEfficient) actions.push(EcoActionType.ENERGY_EFFICIENT);

    // Enregistrer toutes les actions
    const results = [];
    for (const action of actions) {
      const result = await ecoWarrior.recordAction(action, serviceData);
      if (result) results.push(result);
    }

    return results;
  }, [ecoWarrior]);

  return {
    ...ecoWarrior,
    recordServiceAction,
  };
}

// Hook pour les défis communautaires
export function useEcoChallenges() {
  const [challenges, setChallenges] = useState([
    {
      id: "weekly_bike",
      title: "Défi Vélo de la Semaine",
      description: "Effectuez 5 livraisons à vélo cette semaine",
      progress: 3,
      target: 5,
      reward: 200,
      timeLeft: "3 jours",
      type: "WEEKLY"
    },
    {
      id: "monthly_co2",
      title: "Sauveur de CO2 du Mois",
      description: "Économisez 2kg de CO2 ce mois",
      progress: 1.2,
      target: 2.0,
      reward: 500,
      timeLeft: "12 jours",
      type: "MONTHLY"
    }
  ]);

  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);

  const completeChallenge = useCallback((challengeId: string) => {
    setCompletedChallenges(prev => [...prev, challengeId]);
    toast({
      title: "🎯 Défi relevé !",
      description: "Vous avez terminé un défi communautaire !",
      duration: 5000,
    });
  }, []);

  return {
    challenges,
    completedChallenges,
    completeChallenge,
    activeChallenges: challenges.filter(c => !completedChallenges.includes(c.id)),
  };
}