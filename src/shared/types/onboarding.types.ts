/** 
 * Types pour le système de tutoriel/onboarding
 */

// Type pour une étape du tutoriel
export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetElementId?: string;
  featureId?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  order: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Type pour la progression d'un utilisateur
export interface TutorialProgress {
  userId: string;
  currentStepId: string | null;
  completedSteps: string[];
  isCompleted: boolean;
  lastUpdated: Date;
}

// Type pour les données de mise à jour de la progression
export interface UpdateTutorialProgressData {
  currentStepId?: string | null;
  completedStepId?: string;
  isCompleted?: boolean;
}

// Type pour les paramètres de recherche Prisma
// Utilise un générique pour éviter 'any'
export interface PrismaWhereInput {
  id?: string;
  userId?: string;
  featureId?: string;
  isCompleted?: boolean;
}

export interface OnboardingStep extends TutorialStep {}

export interface OnboardingState {
  isActive: boolean;
  currentStep: TutorialStep | null;
  steps: TutorialStep[];
  progress: TutorialProgress | null;
  isLoading: boolean;
  error: Error | null;
}

export interface TutorialContextType {
  isActive: boolean;
  currentStep: TutorialStep | null;
  steps: TutorialStep[];
  progress: TutorialProgress | null;
  isLoading: boolean;
  error: Error | null;
  startTutorial: () => Promise<void>;
  endTutorial: () => Promise<void>;
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  skipTutorial: () => Promise<void>;
  goToStep: (stepId: string) => Promise<void>;
}