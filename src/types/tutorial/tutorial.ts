// Types principaux pour les tutoriaux
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  targetRole: UserRole[];
  difficulty: TutorialDifficulty;
  estimatedDuration: number; // en minutes
  prerequisites: string[];
  steps: TutorialStep[];
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TutorialCategory =
  | "ONBOARDING"
  | "FEATURE_INTRODUCTION"
  | "WORKFLOW"
  | "TROUBLESHOOTING"
  | "ADVANCED";

export type TutorialDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type UserRole =
  | "CLIENT"
  | "DELIVERER"
  | "MERCHANT"
  | "PROVIDER"
  | "ADMIN";

export interface TutorialConfig {
  autoStart: boolean;
  showProgress: boolean;
  allowSkip: boolean;
  showHints: boolean;
  pauseOnFocus: boolean;
  theme: "LIGHT" | "DARK" | "AUTO";
}

export interface TutorialContext {
  currentTutorial: Tutorial | null;
  currentStep: TutorialStep | null;
  progress: TutorialProgress | null;
  config: TutorialConfig;
  isActive: boolean;
  isPaused: boolean;
}
