// Types pour le progrès du tutoriel
export interface TutorialProgress {
  userId: string;
  tutorialId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  status: TutorialStatus;
}

export type TutorialStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface ProgressStats {
  percentage: number;
  timeSpent: number; // en minutes
  stepsRemaining: number;
  estimatedTimeRemaining: number;
}

export interface UserTutorialHistory {
  userId: string;
  completedTutorials: string[];
  inProgressTutorials: string[];
  skippedTutorials: string[];
  totalTimeSpent: number;
  preferredLearningStyle?: 'VISUAL' | 'TEXTUAL' | 'INTERACTIVE';
}