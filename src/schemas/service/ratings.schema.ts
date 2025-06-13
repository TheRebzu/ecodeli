import { z } from "zod";

// ===== SCHÉMAS DE RATINGS ET ÉVALUATIONS =====

// Schéma pour créer une évaluation simple
export const createReviewSchema = z.object({
  bookingId: z.string().cuid({ message: "ID de réservation invalide" }),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// Schéma pour créer une évaluation détaillée
export const createDetailedReviewSchema = z.object({
  bookingId: z.string().cuid({ message: "ID de réservation invalide" }),
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .max(1000, "Le commentaire ne peut pas dépasser 1000 caractères")
    .optional(),
  pros: z
    .array(z.string().max(200))
    .max(5, "Maximum 5 points positifs")
    .optional(),
  cons: z
    .array(z.string().max(200))
    .max(5, "Maximum 5 points négatifs")
    .optional(),
  wouldRecommend: z.boolean().optional(),
  // Évaluations détaillées (1-5)
  punctuality: z.number().int().min(1).max(5).optional(),
  quality: z.number().int().min(1).max(5).optional(),
  communication: z.number().int().min(1).max(5).optional(),
  valueForMoney: z.number().int().min(1).max(5).optional(),
});

// Schéma pour mettre à jour une évaluation
export const updateReviewSchema = createDetailedReviewSchema.partial().extend({
  id: z.string().cuid({ message: "ID d'évaluation invalide" }),
});

// Schéma pour filtrer les évaluations
export const reviewFilterSchema = z.object({
  providerId: z.string().cuid().optional(),
  serviceId: z.string().cuid().optional(),
  minRating: z.number().int().min(1).max(5).optional(),
  maxRating: z.number().int().min(1).max(5).optional(),
  hasComment: z.boolean().optional(),
  wouldRecommend: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["rating", "createdAt", "helpful"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Schéma pour rechercher des prestataires par rating
export const providerRatingSearchSchema = z.object({
  categoryId: z.string().cuid().optional(),
  minRating: z.number().min(0).max(5).default(0),
  minReviews: z.number().int().min(0).default(0),
  city: z.string().optional(),
  badges: z.array(z.string()).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(10),
  sortBy: z.enum(["rating", "reviews", "badges"]).default("rating"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Schéma pour les statistiques de rating
export const ratingStatsSchema = z.object({
  providerId: z.string().cuid(),
  includeDistribution: z.boolean().default(true),
  includeRecentReviews: z.boolean().default(true),
  recentReviewsLimit: z.number().int().min(1).max(50).default(10),
});

// Schéma pour marquer une évaluation comme utile
export const markReviewHelpfulSchema = z.object({
  reviewId: z.string().cuid({ message: "ID d'évaluation invalide" }),
  helpful: z.boolean(),
});

// Schéma pour signaler une évaluation
export const reportReviewSchema = z.object({
  reviewId: z.string().cuid({ message: "ID d'évaluation invalide" }),
  reason: z.enum([
    "INAPPROPRIATE_CONTENT",
    "SPAM",
    "FAKE_REVIEW",
    "PERSONAL_INFORMATION",
    "OFFENSIVE_LANGUAGE",
    "OTHER",
  ]),
  description: z.string().max(500).optional(),
});

// Schéma pour répondre à une évaluation (prestataire)
export const respondToReviewSchema = z.object({
  reviewId: z.string().cuid({ message: "ID d'évaluation invalide" }),
  response: z
    .string()
    .min(10, "La réponse doit contenir au moins 10 caractères")
    .max(500, "La réponse ne peut pas dépasser 500 caractères"),
});

// Schéma pour obtenir des badges
export const badgeCalculationSchema = z.object({
  providerId: z.string().cuid(),
  includeStats: z.boolean().default(true),
  includeRequirements: z.boolean().default(false),
});

// ===== TYPES D'EXPORT =====

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateDetailedReviewInput = z.infer<
  typeof createDetailedReviewSchema
>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewFilterInput = z.infer<typeof reviewFilterSchema>;
export type ProviderRatingSearchInput = z.infer<
  typeof providerRatingSearchSchema
>;
export type RatingStatsInput = z.infer<typeof ratingStatsSchema>;
export type MarkReviewHelpfulInput = z.infer<typeof markReviewHelpfulSchema>;
export type ReportReviewInput = z.infer<typeof reportReviewSchema>;
export type RespondToReviewInput = z.infer<typeof respondToReviewSchema>;
export type BadgeCalculationInput = z.infer<typeof badgeCalculationSchema>;

// ===== TYPES D'INTERFACE =====

export interface ReviewData {
  id: string;
  rating: number;
  comment?: string;
  pros?: string[];
  cons?: string[];
  wouldRecommend?: boolean;
  punctuality?: number;
  quality?: number;
  communication?: number;
  valueForMoney?: number;
  helpfulVotes: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  client: {
    id: string;
    name: string;
    image?: string;
  };
  service: {
    id: string;
    name: string;
  };
  response?: {
    content: string;
    createdAt: Date;
  };
}

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  detailedAverages: {
    punctuality: number;
    quality: number;
    communication: number;
    valueForMoney: number;
  };
  ratingDistribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  recommendationRate: number;
  recentReviews: ReviewData[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  level: "standard" | "premium" | "elite";
  earnedAt?: Date;
  requirements?: {
    minRating?: number;
    minReviews?: number;
    minBookings?: number;
    maxCancellationRate?: number;
    minRecommendationRate?: number;
  };
}

export interface ProviderBadges {
  badges: Badge[];
  totalBadges: number;
  premiumBadges: number;
  stats: {
    averageRating: number;
    totalReviews: number;
    recommendationRate: number;
    cancellationRate: number;
    totalBookings: number;
  };
  nextBadge?: {
    badge: Badge;
    progress: number; // 0-100
    requirement: string;
  };
}

// ===== CONSTANTES =====

export const RATING_LEVELS = {
  EXCELLENT: { min: 4.5, label: "Excellent", color: "green" },
  VERY_GOOD: { min: 4.0, label: "Très bien", color: "blue" },
  GOOD: { min: 3.5, label: "Bien", color: "yellow" },
  FAIR: { min: 3.0, label: "Correct", color: "orange" },
  POOR: { min: 0, label: "Insuffisant", color: "red" },
} as const;

export const BADGE_REQUIREMENTS = {
  EXCELLENCE: { minRating: 4.5, minReviews: 10 },
  QUALITY: { minRating: 4.0, minReviews: 5 },
  PUNCTUAL: { minPunctuality: 4.5, minReviews: 5 },
  COMMUNICATOR: { minCommunication: 4.5, minReviews: 5 },
  RECOMMENDED: { minRecommendationRate: 90, minReviews: 10 },
  EXPERIENCED: { minBookings: 100 },
  RELIABLE: { maxCancellationRate: 5, minBookings: 20 },
} as const;
