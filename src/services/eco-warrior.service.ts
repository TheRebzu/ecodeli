export interface EcoAction {
  id: string;
  type: EcoActionType;
  points: number;
  co2Saved: number; // en grammes
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface EcoBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  requirement: {
    type: "POINTS" | "ACTIONS" | "CO2_SAVED" | "STREAK" | "SPECIAL";
    value: number;
    timeframe?: "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";
  };
  unlockedAt?: Date;
  progress?: number;
}

export interface EcoLevel {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  perks: string[];
}

export interface EcoStats {
  totalPoints: number;
  currentLevel: EcoLevel;
  nextLevel?: EcoLevel;
  co2SavedTotal: number; // en grammes
  co2SavedThisMonth: number;
  actionsCount: number;
  currentStreak: number;
  longestStreak: number;
  badges: EcoBadge[];
  recentActions: EcoAction[];
}

export enum EcoActionType {
  // Actions de livraison
  DELIVERY_COMPLETED = "DELIVERY_COMPLETED",
  DELIVERY_ON_TIME = "DELIVERY_ON_TIME",
  DELIVERY_EARLY = "DELIVERY_EARLY",
  ECO_FRIENDLY_ROUTE = "ECO_FRIENDLY_ROUTE",
  BIKE_DELIVERY = "BIKE_DELIVERY",
  ELECTRIC_VEHICLE = "ELECTRIC_VEHICLE",
  WALKING_DELIVERY = "WALKING_DELIVERY",
  
  // Actions d'emballage
  REUSABLE_PACKAGING = "REUSABLE_PACKAGING",
  MINIMAL_PACKAGING = "MINIMAL_PACKAGING",
  RECYCLED_PACKAGING = "RECYCLED_PACKAGING",
  NO_PLASTIC_PACKAGING = "NO_PLASTIC_PACKAGING",
  
  // Actions de consommation
  LOCAL_PURCHASE = "LOCAL_PURCHASE",
  ORGANIC_PURCHASE = "ORGANIC_PURCHASE",
  SEASONAL_PURCHASE = "SEASONAL_PURCHASE",
  BULK_PURCHASE = "BULK_PURCHASE",
  
  // Actions de service
  SERVICE_ECO_FRIENDLY = "SERVICE_ECO_FRIENDLY",
  GREEN_CLEANING = "GREEN_CLEANING",
  ENERGY_EFFICIENT = "ENERGY_EFFICIENT",
  
  // Actions communautaires
  REFERRAL = "REFERRAL",
  FEEDBACK_PROVIDED = "FEEDBACK_PROVIDED",
  ECO_TIP_SHARED = "ECO_TIP_SHARED",
  COMMUNITY_CHALLENGE = "COMMUNITY_CHALLENGE",
  
  // Actions spéciales
  DAILY_LOGIN = "DAILY_LOGIN",
  WEEKLY_GOAL = "WEEKLY_GOAL",
  MONTHLY_CHAMPION = "MONTHLY_CHAMPION",
  PERFECT_WEEK = "PERFECT_WEEK"
}

export class EcoWarriorService {
  private readonly ECO_LEVELS: EcoLevel[] = [
    {
      level: 1,
      name: "Eco-Débutant",
      minPoints: 0,
      maxPoints: 99,
      color: "#8B5A3C",
      perks: ["Badge de débutant", "Accès aux conseils eco"]
    },
    {
      level: 2,
      name: "Eco-Apprenti",
      minPoints: 100,
      maxPoints: 249,
      color: "#CD7F32",
      perks: ["Réductions 5%", "Notifications prioritaires"]
    },
    {
      level: 3,
      name: "Eco-Citoyen",
      minPoints: 250,
      maxPoints: 499,
      color: "#C0C0C0",
      perks: ["Réductions 10%", "Accès aux défis spéciaux"]
    },
    {
      level: 4,
      name: "Eco-Gardien",
      minPoints: 500,
      maxPoints: 999,
      color: "#FFD700",
      perks: ["Réductions 15%", "Support prioritaire", "Badge exclusif"]
    },
    {
      level: 5,
      name: "Eco-Champion",
      minPoints: 1000,
      maxPoints: 1999,
      color: "#E5E4E2",
      perks: ["Réductions 20%", "Accès anticipé aux nouvelles fonctionnalités"]
    },
    {
      level: 6,
      name: "Eco-Légende",
      minPoints: 2000,
      maxPoints: Infinity,
      color: "#B76E79",
      perks: ["Réductions 25%", "Statut VIP", "Invitations aux événements exclusifs"]
    }
  ];

  private readonly ACTION_POINTS: Record<EcoActionType, { points: number; co2Saved: number }> = {
    [EcoActionType.DELIVERY_COMPLETED]: { points: 10, co2Saved: 50 },
    [EcoActionType.DELIVERY_ON_TIME]: { points: 5, co2Saved: 25 },
    [EcoActionType.DELIVERY_EARLY]: { points: 15, co2Saved: 35 },
    [EcoActionType.ECO_FRIENDLY_ROUTE]: { points: 20, co2Saved: 100 },
    [EcoActionType.BIKE_DELIVERY]: { points: 50, co2Saved: 500 },
    [EcoActionType.ELECTRIC_VEHICLE]: { points: 30, co2Saved: 300 },
    [EcoActionType.WALKING_DELIVERY]: { points: 40, co2Saved: 400 },
    
    [EcoActionType.REUSABLE_PACKAGING]: { points: 25, co2Saved: 150 },
    [EcoActionType.MINIMAL_PACKAGING]: { points: 15, co2Saved: 75 },
    [EcoActionType.RECYCLED_PACKAGING]: { points: 20, co2Saved: 100 },
    [EcoActionType.NO_PLASTIC_PACKAGING]: { points: 35, co2Saved: 200 },
    
    [EcoActionType.LOCAL_PURCHASE]: { points: 30, co2Saved: 200 },
    [EcoActionType.ORGANIC_PURCHASE]: { points: 25, co2Saved: 150 },
    [EcoActionType.SEASONAL_PURCHASE]: { points: 20, co2Saved: 100 },
    [EcoActionType.BULK_PURCHASE]: { points: 15, co2Saved: 80 },
    
    [EcoActionType.SERVICE_ECO_FRIENDLY]: { points: 40, co2Saved: 250 },
    [EcoActionType.GREEN_CLEANING]: { points: 30, co2Saved: 180 },
    [EcoActionType.ENERGY_EFFICIENT]: { points: 35, co2Saved: 220 },
    
    [EcoActionType.REFERRAL]: { points: 100, co2Saved: 0 },
    [EcoActionType.FEEDBACK_PROVIDED]: { points: 10, co2Saved: 0 },
    [EcoActionType.ECO_TIP_SHARED]: { points: 15, co2Saved: 0 },
    [EcoActionType.COMMUNITY_CHALLENGE]: { points: 50, co2Saved: 0 },
    
    [EcoActionType.DAILY_LOGIN]: { points: 5, co2Saved: 0 },
    [EcoActionType.WEEKLY_GOAL]: { points: 100, co2Saved: 0 },
    [EcoActionType.MONTHLY_CHAMPION]: { points: 500, co2Saved: 0 },
    [EcoActionType.PERFECT_WEEK]: { points: 200, co2Saved: 0 }
  };

  private readonly AVAILABLE_BADGES: Omit<EcoBadge, 'unlockedAt' | 'progress'>[] = [
    {
      id: "first_delivery",
      name: "Premier Pas",
      description: "Votre première livraison éco-responsable",
      icon: "🌱",
      tier: "BRONZE",
      requirement: { type: "ACTIONS", value: 1 }
    },
    {
      id: "eco_rookie",
      name: "Recrue Écologique",
      description: "100 points éco-responsables",
      icon: "🌿",
      tier: "BRONZE",
      requirement: { type: "POINTS", value: 100 }
    },
    {
      id: "green_warrior",
      name: "Guerrier Vert",
      description: "500 points éco-responsables",
      icon: "🌳",
      tier: "SILVER",
      requirement: { type: "POINTS", value: 500 }
    },
    {
      id: "eco_champion",
      name: "Champion Écologique",
      description: "1000 points éco-responsables",
      icon: "🏆",
      tier: "GOLD",
      requirement: { type: "POINTS", value: 1000 }
    },
    {
      id: "carbon_saver",
      name: "Sauveur de Carbone",
      description: "Économiser 1kg de CO2",
      icon: "🌍",
      tier: "SILVER",
      requirement: { type: "CO2_SAVED", value: 1000 }
    },
    {
      id: "carbon_hero",
      name: "Héros du Carbone",
      description: "Économiser 5kg de CO2",
      icon: "🦸",
      tier: "GOLD",
      requirement: { type: "CO2_SAVED", value: 5000 }
    },
    {
      id: "streak_master",
      name: "Maître de la Régularité",
      description: "7 jours consécutifs d'actions éco",
      icon: "🔥",
      tier: "SILVER",
      requirement: { type: "STREAK", value: 7 }
    },
    {
      id: "monthly_hero",
      name: "Héros du Mois",
      description: "Champion du mois",
      icon: "⭐",
      tier: "PLATINUM",
      requirement: { type: "SPECIAL", value: 1 }
    },
    {
      id: "bike_lover",
      name: "Amoureux du Vélo",
      description: "10 livraisons à vélo",
      icon: "🚲",
      tier: "GOLD",
      requirement: { type: "ACTIONS", value: 10 }
    },
    {
      id: "packaging_master",
      name: "Maître de l'Emballage",
      description: "20 livraisons avec emballage réutilisable",
      icon: "📦",
      tier: "GOLD",
      requirement: { type: "ACTIONS", value: 20 }
    }
  ];

  /**
   * Enregistre une action éco-responsable
   */
  async recordEcoAction(
    userId: string,
    actionType: EcoActionType,
    metadata?: Record<string, any>
  ): Promise<{ action: EcoAction; levelUp: boolean; newBadges: EcoBadge[] }> {
    const actionConfig = this.ACTION_POINTS[actionType];
    if (!actionConfig) {
      throw new Error(`Type d'action inconnu: ${actionType}`);
    }

    // Créer l'action
    const action: EcoAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: actionType,
      points: actionConfig.points,
      co2Saved: actionConfig.co2Saved,
      description: this.getActionDescription(actionType),
      timestamp: new Date(),
      metadata
    };

    // Calculer les nouveaux totaux
    const currentStats = await this.getUserEcoStats(userId);
    const newTotalPoints = currentStats.totalPoints + action.points;
    const newCO2Total = currentStats.co2SavedTotal + action.co2Saved;

    // Vérifier le changement de niveau
    const newLevel = this.calculateLevel(newTotalPoints);
    const levelUp = newLevel.level > currentStats.currentLevel.level;

    // Vérifier les nouveaux badges
    const newBadges = await this.checkForNewBadges(userId, {
      totalPoints: newTotalPoints,
      co2SavedTotal: newCO2Total,
      actionsCount: currentStats.actionsCount + 1,
      actionType
    });

    // Ici, on sauvegarderait en base de données
    // await this.saveEcoAction(userId, action, newTotalPoints, newCO2Total);

    return {
      action,
      levelUp,
      newBadges
    };
  }

  /**
   * Obtient les statistiques éco d'un utilisateur
   */
  async getUserEcoStats(userId: string): Promise<EcoStats> {
    // Ici, on récupérerait les données depuis la base
    // Pour la démo, on simule des données
    const totalPoints = 750; // Simulé
    const currentLevel = this.calculateLevel(totalPoints);
    const nextLevel = this.getNextLevel(currentLevel.level);

    return {
      totalPoints,
      currentLevel,
      nextLevel,
      co2SavedTotal: 3500, // 3.5kg
      co2SavedThisMonth: 1200,
      actionsCount: 45,
      currentStreak: 5,
      longestStreak: 12,
      badges: this.getUserBadges(totalPoints, 3500, 45),
      recentActions: this.getRecentActions() // Simulé
    };
  }

  /**
   * Calcule le niveau basé sur les points
   */
  private calculateLevel(points: number): EcoLevel {
    for (let i = this.ECO_LEVELS.length - 1; i >= 0; i--) {
      const level = this.ECO_LEVELS[i];
      if (points >= level.minPoints) {
        return level;
      }
    }
    return this.ECO_LEVELS[0];
  }

  /**
   * Obtient le niveau suivant
   */
  private getNextLevel(currentLevel: number): EcoLevel | undefined {
    return this.ECO_LEVELS.find(level => level.level === currentLevel + 1);
  }

  /**
   * Vérifie les nouveaux badges débloqués
   */
  private async checkForNewBadges(
    userId: string,
    stats: {
      totalPoints: number;
      co2SavedTotal: number;
      actionsCount: number;
      actionType: EcoActionType;
    }
  ): Promise<EcoBadge[]> {
    const newBadges: EcoBadge[] = [];
    const currentBadges = this.getUserBadges(stats.totalPoints, stats.co2SavedTotal, stats.actionsCount);
    const currentBadgeIds = new Set(currentBadges.map(b => b.id));

    for (const badgeTemplate of this.AVAILABLE_BADGES) {
      if (currentBadgeIds.has(badgeTemplate.id)) continue;

      const isUnlocked = this.checkBadgeRequirement(badgeTemplate, stats);
      if (isUnlocked) {
        newBadges.push({
          ...badgeTemplate,
          unlockedAt: new Date(),
          progress: 100
        });
      }
    }

    return newBadges;
  }

  /**
   * Vérifie si un badge est débloqué
   */
  private checkBadgeRequirement(
    badge: Omit<EcoBadge, 'unlockedAt' | 'progress'>,
    stats: {
      totalPoints: number;
      co2SavedTotal: number;
      actionsCount: number;
      actionType: EcoActionType;
    }
  ): boolean {
    const { requirement } = badge;

    switch (requirement.type) {
      case "POINTS":
        return stats.totalPoints >= requirement.value;
      
      case "CO2_SAVED":
        return stats.co2SavedTotal >= requirement.value;
      
      case "ACTIONS":
        if (badge.id === "bike_lover") {
          // Logique spécifique pour compter les livraisons à vélo
          return stats.actionType === EcoActionType.BIKE_DELIVERY;
        }
        if (badge.id === "packaging_master") {
          // Logique spécifique pour compter les emballages réutilisables
          return stats.actionType === EcoActionType.REUSABLE_PACKAGING;
        }
        return stats.actionsCount >= requirement.value;
      
      case "STREAK":
        // Ici, on vérifierait la streak actuelle
        return false; // Nécessiterait l'implémentation du système de streak
      
      case "SPECIAL":
        // Badges spéciaux attribués manuellement
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Obtient les badges d'un utilisateur (simulé)
   */
  private getUserBadges(totalPoints: number, co2Saved: number, actionsCount: number): EcoBadge[] {
    const badges: EcoBadge[] = [];

    for (const badgeTemplate of this.AVAILABLE_BADGES) {
      let isUnlocked = false;
      let progress = 0;

      switch (badgeTemplate.requirement.type) {
        case "POINTS":
          progress = (totalPoints / badgeTemplate.requirement.value) * 100;
          isUnlocked = totalPoints >= badgeTemplate.requirement.value;
          break;
        case "CO2_SAVED":
          progress = (co2Saved / badgeTemplate.requirement.value) * 100;
          isUnlocked = co2Saved >= badgeTemplate.requirement.value;
          break;
        case "ACTIONS":
          progress = (actionsCount / badgeTemplate.requirement.value) * 100;
          isUnlocked = actionsCount >= badgeTemplate.requirement.value;
          break;
      }

      if (isUnlocked || progress > 0) {
        badges.push({
          ...badgeTemplate,
          progress: Math.min(100, progress),
          unlockedAt: isUnlocked ? new Date() : undefined
        });
      }
    }

    return badges.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  }

  /**
   * Obtient les actions récentes (simulé)
   */
  private getRecentActions(): EcoAction[] {
    const now = new Date();
    return [
      {
        id: "1",
        type: EcoActionType.DELIVERY_COMPLETED,
        points: 10,
        co2Saved: 50,
        description: "Livraison éco-responsable terminée",
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2h ago
      },
      {
        id: "2",
        type: EcoActionType.REUSABLE_PACKAGING,
        points: 25,
        co2Saved: 150,
        description: "Emballage réutilisable utilisé",
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000) // 6h ago
      },
      {
        id: "3",
        type: EcoActionType.BIKE_DELIVERY,
        points: 50,
        co2Saved: 500,
        description: "Livraison effectuée à vélo",
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago
      }
    ];
  }

  /**
   * Obtient la description d'une action
   */
  private getActionDescription(actionType: EcoActionType): string {
    const descriptions: Record<EcoActionType, string> = {
      [EcoActionType.DELIVERY_COMPLETED]: "Livraison éco-responsable terminée",
      [EcoActionType.DELIVERY_ON_TIME]: "Livraison ponctuelle",
      [EcoActionType.DELIVERY_EARLY]: "Livraison en avance",
      [EcoActionType.ECO_FRIENDLY_ROUTE]: "Itinéraire éco-responsable emprunté",
      [EcoActionType.BIKE_DELIVERY]: "Livraison effectuée à vélo",
      [EcoActionType.ELECTRIC_VEHICLE]: "Livraison avec véhicule électrique",
      [EcoActionType.WALKING_DELIVERY]: "Livraison à pied",
      
      [EcoActionType.REUSABLE_PACKAGING]: "Emballage réutilisable utilisé",
      [EcoActionType.MINIMAL_PACKAGING]: "Emballage minimal utilisé",
      [EcoActionType.RECYCLED_PACKAGING]: "Emballage recyclé utilisé",
      [EcoActionType.NO_PLASTIC_PACKAGING]: "Emballage sans plastique utilisé",
      
      [EcoActionType.LOCAL_PURCHASE]: "Achat local effectué",
      [EcoActionType.ORGANIC_PURCHASE]: "Achat bio effectué",
      [EcoActionType.SEASONAL_PURCHASE]: "Achat de saison effectué",
      [EcoActionType.BULK_PURCHASE]: "Achat en vrac effectué",
      
      [EcoActionType.SERVICE_ECO_FRIENDLY]: "Service éco-responsable fourni",
      [EcoActionType.GREEN_CLEANING]: "Nettoyage écologique effectué",
      [EcoActionType.ENERGY_EFFICIENT]: "Service économe en énergie",
      
      [EcoActionType.REFERRAL]: "Parrainage effectué",
      [EcoActionType.FEEDBACK_PROVIDED]: "Commentaire fourni",
      [EcoActionType.ECO_TIP_SHARED]: "Conseil écologique partagé",
      [EcoActionType.COMMUNITY_CHALLENGE]: "Défi communautaire relevé",
      
      [EcoActionType.DAILY_LOGIN]: "Connexion quotidienne",
      [EcoActionType.WEEKLY_GOAL]: "Objectif hebdomadaire atteint",
      [EcoActionType.MONTHLY_CHAMPION]: "Champion du mois",
      [EcoActionType.PERFECT_WEEK]: "Semaine parfaite accomplie"
    };

    return descriptions[actionType] || "Action éco-responsable";
  }

  /**
   * Calcule l'impact environnemental
   */
  calculateEnvironmentalImpact(co2SavedGrams: number): {
    treesEquivalent: number;
    kmByCarEquivalent: number;
    kwhEquivalent: number;
  } {
    // 1 arbre absorbe ~21.7kg de CO2 par an
    const treesEquivalent = co2SavedGrams / (21700 / 365); // Par jour
    
    // 1km en voiture = ~120g de CO2
    const kmByCarEquivalent = co2SavedGrams / 120;
    
    // 1 kWh d'électricité = ~230g de CO2 en France
    const kwhEquivalent = co2SavedGrams / 230;

    return {
      treesEquivalent: Math.round(treesEquivalent * 100) / 100,
      kmByCarEquivalent: Math.round(kmByCarEquivalent * 10) / 10,
      kwhEquivalent: Math.round(kwhEquivalent * 100) / 100
    };
  }

  /**
   * Obtient le classement des utilisateurs (simulé)
   */
  async getLeaderboard(timeframe: "WEEKLY" | "MONTHLY" | "ALL_TIME" = "MONTHLY"): Promise<{
    ranking: Array<{
      rank: number;
      userId: string;
      username: string;
      points: number;
      co2Saved: number;
      level: EcoLevel;
      isCurrentUser?: boolean;
    }>;
    userRank?: number;
  }> {
    // Simulé pour la démo
    const mockRanking = [
      { rank: 1, userId: "user1", username: "EcoMaster", points: 2500, co2Saved: 12000, level: this.calculateLevel(2500) },
      { rank: 2, userId: "user2", username: "GreenHero", points: 2200, co2Saved: 11000, level: this.calculateLevel(2200) },
      { rank: 3, userId: "user3", username: "EcoWarrior", points: 1800, co2Saved: 9500, level: this.calculateLevel(1800) },
      { rank: 4, userId: "currentUser", username: "Vous", points: 750, co2Saved: 3500, level: this.calculateLevel(750), isCurrentUser: true },
      { rank: 5, userId: "user5", username: "PlanetSaver", points: 650, co2Saved: 3200, level: this.calculateLevel(650) },
    ];

    return {
      ranking: mockRanking,
      userRank: 4
    };
  }
}

// Instance singleton
export const ecoWarriorService = new EcoWarriorService();