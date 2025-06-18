import { UserRole } from "@prisma/client";

export interface PricingRules {
  baseCommission: number;
  volumeDiscounts: VolumeDiscount[];
  serviceTypeMultipliers: Record<string, number>;
  urgencyMultipliers: Record<string, number>;
  distanceMultipliers: DistanceMultiplier[];
  timeMultipliers: TimeMultiplier[];
  loyaltyDiscounts: LoyaltyDiscount[];
}

export interface VolumeDiscount {
  minOrders: number;
  maxOrders?: number;
  discountPercentage: number;
}

export interface DistanceMultiplier {
  minDistance: number;
  maxDistance?: number;
  multiplier: number;
}

export interface TimeMultiplier {
  dayOfWeek?: number[]; // 0-6, 0 = Sunday
  hourStart: number; // 0-23
  hourEnd: number; // 0-23
  multiplier: number;
  label: string;
}

export interface LoyaltyDiscount {
  minMonthsActive: number;
  discountPercentage: number;
  userRole?: UserRole;
}

export interface PricingCalculationInput {
  baseAmount: number;
  serviceType: string;
  distance?: number;
  urgency?: string;
  userRole: UserRole;
  userId: string;
  deliveryDateTime?: Date;
  userStats?: {
    monthsActive: number;
    totalOrders: number;
    monthlyOrders: number;
  };
}

export interface PricingCalculationResult {
  baseAmount: number;
  commission: number;
  commissionRate: number;
  totalAmount: number;
  breakdown: PricingBreakdown;
  appliedRules: string[];
}

export interface PricingBreakdown {
  baseCommission: number;
  volumeDiscount: number;
  serviceTypeAdjustment: number;
  urgencyAdjustment: number;
  distanceAdjustment: number;
  timeAdjustment: number;
  loyaltyDiscount: number;
  finalCommission: number;
}

// Configuration par défaut des règles de tarification
const DEFAULT_PRICING_RULES: PricingRules = {
  baseCommission: 0.15, // 15%
  
  volumeDiscounts: [
    { minOrders: 50, maxOrders: 99, discountPercentage: 5 },
    { minOrders: 100, maxOrders: 199, discountPercentage: 10 },
    { minOrders: 200, discountPercentage: 15 },
  ],
  
  serviceTypeMultipliers: {
    "standard_delivery": 1.0,
    "express_delivery": 1.5,
    "same_day_delivery": 2.0,
    "scheduled_delivery": 0.9,
    "bulk_delivery": 0.8,
    "fragile_delivery": 1.3,
    "grocery_shopping": 1.2,
    "pharmacy_delivery": 1.4,
    "document_delivery": 0.7,
    "furniture_delivery": 1.8,
    "international_purchase": 2.5,
    "pet_sitting": 1.6,
    "home_cleaning": 1.1,
    "handyman_service": 1.3,
    "tutoring": 0.9,
    "elderly_care": 1.4,
  },
  
  urgencyMultipliers: {
    "low": 0.8,
    "normal": 1.0,
    "high": 1.3,
    "urgent": 1.6,
    "emergency": 2.0,
  },
  
  distanceMultipliers: [
    { minDistance: 0, maxDistance: 5, multiplier: 1.0 },
    { minDistance: 5, maxDistance: 15, multiplier: 1.1 },
    { minDistance: 15, maxDistance: 30, multiplier: 1.2 },
    { minDistance: 30, maxDistance: 50, multiplier: 1.4 },
    { minDistance: 50, multiplier: 1.6 },
  ],
  
  timeMultipliers: [
    {
      // Heures de pointe en semaine (8h-10h, 17h-19h)
      dayOfWeek: [1, 2, 3, 4, 5], // Lundi à Vendredi
      hourStart: 8,
      hourEnd: 10,
      multiplier: 1.2,
      label: "Rush matinal",
    },
    {
      dayOfWeek: [1, 2, 3, 4, 5],
      hourStart: 17,
      hourEnd: 19,
      multiplier: 1.2,
      label: "Rush du soir",
    },
    {
      // Weekend (samedi-dimanche)
      dayOfWeek: [0, 6], // Dimanche et Samedi
      hourStart: 0,
      hourEnd: 23,
      multiplier: 1.1,
      label: "Weekend",
    },
    {
      // Nuit (22h-6h)
      hourStart: 22,
      hourEnd: 6,
      multiplier: 1.5,
      label: "Service de nuit",
    },
    {
      // Déjeuner (12h-14h)
      hourStart: 12,
      hourEnd: 14,
      multiplier: 1.1,
      label: "Pause déjeuner",
    },
  ],
  
  loyaltyDiscounts: [
    { minMonthsActive: 6, discountPercentage: 2 },
    { minMonthsActive: 12, discountPercentage: 5 },
    { minMonthsActive: 24, discountPercentage: 8 },
    { minMonthsActive: 36, discountPercentage: 12 },
  ],
};

class PricingCalculatorService {
  private rules: PricingRules;

  constructor(customRules?: Partial<PricingRules>) {
    this.rules = { ...DEFAULT_PRICING_RULES, ...customRules };
  }

  calculatePricing(input: PricingCalculationInput): PricingCalculationResult {
    const appliedRules: string[] = [];
    const breakdown: PricingBreakdown = {
      baseCommission: 0,
      volumeDiscount: 0,
      serviceTypeAdjustment: 0,
      urgencyAdjustment: 0,
      distanceAdjustment: 0,
      timeAdjustment: 0,
      loyaltyDiscount: 0,
      finalCommission: 0,
    };

    // 1. Commission de base
    const baseCommissionRate = this.rules.baseCommission;
    breakdown.baseCommission = input.baseAmount * baseCommissionRate;
    appliedRules.push(`Commission de base: ${(baseCommissionRate * 100).toFixed(1)}%`);

    // 2. Ajustement par type de service
    const serviceMultiplier = this.rules.serviceTypeMultipliers[input.serviceType] || 1.0;
    breakdown.serviceTypeAdjustment = breakdown.baseCommission * (serviceMultiplier - 1);
    if (serviceMultiplier !== 1.0) {
      appliedRules.push(`Type de service "${input.serviceType}": x${serviceMultiplier}`);
    }

    // 3. Ajustement par urgence
    if (input.urgency) {
      const urgencyMultiplier = this.rules.urgencyMultipliers[input.urgency] || 1.0;
      breakdown.urgencyAdjustment = breakdown.baseCommission * (urgencyMultiplier - 1);
      if (urgencyMultiplier !== 1.0) {
        appliedRules.push(`Urgence "${input.urgency}": x${urgencyMultiplier}`);
      }
    }

    // 4. Ajustement par distance
    if (input.distance !== undefined) {
      const distanceMultiplier = this.getDistanceMultiplier(input.distance);
      breakdown.distanceAdjustment = breakdown.baseCommission * (distanceMultiplier - 1);
      if (distanceMultiplier !== 1.0) {
        appliedRules.push(`Distance ${input.distance}km: x${distanceMultiplier}`);
      }
    }

    // 5. Ajustement par heure/jour
    if (input.deliveryDateTime) {
      const timeMultiplier = this.getTimeMultiplier(input.deliveryDateTime);
      if (timeMultiplier.multiplier !== 1.0) {
        breakdown.timeAdjustment = breakdown.baseCommission * (timeMultiplier.multiplier - 1);
        appliedRules.push(`${timeMultiplier.label}: x${timeMultiplier.multiplier}`);
      }
    }

    // 6. Remise volume (basée sur les commandes mensuelles)
    if (input.userStats?.monthlyOrders) {
      const volumeDiscount = this.getVolumeDiscount(input.userStats.monthlyOrders);
      if (volumeDiscount > 0) {
        breakdown.volumeDiscount = -(breakdown.baseCommission * volumeDiscount / 100);
        appliedRules.push(`Remise volume (${input.userStats.monthlyOrders} commandes): -${volumeDiscount}%`);
      }
    }

    // 7. Remise fidélité
    if (input.userStats?.monthsActive) {
      const loyaltyDiscount = this.getLoyaltyDiscount(input.userStats.monthsActive, input.userRole);
      if (loyaltyDiscount > 0) {
        breakdown.loyaltyDiscount = -(breakdown.baseCommission * loyaltyDiscount / 100);
        appliedRules.push(`Fidélité (${input.userStats.monthsActive} mois): -${loyaltyDiscount}%`);
      }
    }

    // Calcul final
    breakdown.finalCommission = Math.max(0, 
      breakdown.baseCommission +
      breakdown.serviceTypeAdjustment +
      breakdown.urgencyAdjustment +
      breakdown.distanceAdjustment +
      breakdown.timeAdjustment +
      breakdown.volumeDiscount +
      breakdown.loyaltyDiscount
    );

    const finalCommissionRate = breakdown.finalCommission / input.baseAmount;

    return {
      baseAmount: input.baseAmount,
      commission: breakdown.finalCommission,
      commissionRate: finalCommissionRate,
      totalAmount: input.baseAmount + breakdown.finalCommission,
      breakdown,
      appliedRules,
    };
  }

  private getDistanceMultiplier(distance: number): number {
    const rule = this.rules.distanceMultipliers.find(
      d => distance >= d.minDistance && (d.maxDistance === undefined || distance < d.maxDistance)
    );
    return rule?.multiplier || 1.0;
  }

  private getTimeMultiplier(date: Date): { multiplier: number; label: string } {
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    // Trouver le multiplicateur avec la priorité la plus élevée
    let bestMatch = { multiplier: 1.0, label: "Horaire standard" };

    for (const rule of this.rules.timeMultipliers) {
      let matches = true;

      // Vérifier le jour de la semaine
      if (rule.dayOfWeek && !rule.dayOfWeek.includes(dayOfWeek)) {
        matches = false;
      }

      // Vérifier l'heure (gérer le cas où hourEnd < hourStart pour les créneaux de nuit)
      if (rule.hourStart <= rule.hourEnd) {
        if (hour < rule.hourStart || hour >= rule.hourEnd) {
          matches = false;
        }
      } else {
        // Créneau de nuit (ex: 22h-6h)
        if (hour < rule.hourStart && hour >= rule.hourEnd) {
          matches = false;
        }
      }

      if (matches && rule.multiplier > bestMatch.multiplier) {
        bestMatch = { multiplier: rule.multiplier, label: rule.label };
      }
    }

    return bestMatch;
  }

  private getVolumeDiscount(monthlyOrders: number): number {
    const discount = this.rules.volumeDiscounts.find(
      d => monthlyOrders >= d.minOrders && (d.maxOrders === undefined || monthlyOrders <= d.maxOrders)
    );
    return discount?.discountPercentage || 0;
  }

  private getLoyaltyDiscount(monthsActive: number, userRole: UserRole): number {
    const applicableDiscounts = this.rules.loyaltyDiscounts.filter(
      d => monthsActive >= d.minMonthsActive && (d.userRole === undefined || d.userRole === userRole)
    );
    
    // Retourner la meilleure remise disponible
    return Math.max(0, ...applicableDiscounts.map(d => d.discountPercentage));
  }

  updateRules(newRules: Partial<PricingRules>): void {
    this.rules = { ...this.rules, ...newRules };
  }

  getRules(): PricingRules {
    return { ...this.rules };
  }

  // Méthodes utilitaires pour tests et validation
  validatePricingForScenarios(scenarios: PricingCalculationInput[]): {
    results: PricingCalculationResult[];
    validationReport: {
      totalScenarios: number;
      validResults: number;
      invalidResults: number;
      averageCommission: number;
      maxCommission: number;
      minCommission: number;
      errors: string[];
    };
  } {
    const results: PricingCalculationResult[] = [];
    const errors: string[] = [];
    
    scenarios.forEach((scenario, index) => {
      try {
        const result = this.calculatePricing(scenario);
        
        // Validations métier
        if (result.commission < 0) {
          errors.push(`Scénario ${index + 1}: Commission négative détectée`);
        }
        
        if (result.commissionRate > 0.5) {
          errors.push(`Scénario ${index + 1}: Taux de commission excessif (${(result.commissionRate * 100).toFixed(1)}%)`);
        }
        
        if (result.totalAmount < scenario.baseAmount) {
          errors.push(`Scénario ${index + 1}: Montant total inférieur au montant de base`);
        }
        
        results.push(result);
      } catch (error) {
        errors.push(`Scénario ${index + 1}: Erreur de calcul - ${error.message}`);
      }
    });
    
    const validResults = results.filter(r => r.commission >= 0 && r.commissionRate <= 0.5);
    const commissions = validResults.map(r => r.commission);
    
    return {
      results,
      validationReport: {
        totalScenarios: scenarios.length,
        validResults: validResults.length,
        invalidResults: results.length - validResults.length,
        averageCommission: commissions.length > 0 ? commissions.reduce((sum, c) => sum + c, 0) / commissions.length : 0,
        maxCommission: commissions.length > 0 ? Math.max(...commissions) : 0,
        minCommission: commissions.length > 0 ? Math.min(...commissions) : 0,
        errors
      }
    };
  }

  getPricingEstimate(baseAmount: number, serviceType: string): PricingCalculationResult {
    return this.calculatePricing({
      baseAmount,
      serviceType,
      userRole: UserRole.CLIENT,
      userId: "estimate",
    });
  }
}

// Instance singleton
export const pricingCalculator = new PricingCalculatorService();

// Helper functions
export const calculateDynamicCommission = (input: PricingCalculationInput): PricingCalculationResult => {
  return pricingCalculator.calculatePricing(input);
};

export const getPricingEstimate = (baseAmount: number, serviceType: string): PricingCalculationResult => {
  return pricingCalculator.getPricingEstimate(baseAmount, serviceType);
};

export const updatePricingRules = (newRules: Partial<PricingRules>): void => {
  pricingCalculator.updateRules(newRules);
};

export default pricingCalculator;