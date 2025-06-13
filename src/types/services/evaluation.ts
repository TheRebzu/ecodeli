// Types pour les évaluations
export interface ServiceEvaluation {
  id: string;
  serviceId: string;
  clientId: string;
  providerId: string;
  rating: number;
  comment?: string;
  criteria: EvaluationCriteria[];
  createdAt: Date;
}

export interface EvaluationCriteria {
  name: string;
  score: number;
  weight: number;
}

export interface EvaluationStats {
  averageRating: number;
  totalEvaluations: number;
  distribution: Record<number, number>;
}
