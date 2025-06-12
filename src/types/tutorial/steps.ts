// Types pour les étapes de tutoriel
export interface TutorialStep {
  id: string;
  tutorialId: string;
  order: number;
  title: string;
  content: string;
  type: StepType;
  target?: string;
  action?: StepAction;
  validation?: StepValidation;
  hints?: string[];
  duration?: number; // durée estimée en secondes
}

export type StepType = 
  | 'INTRODUCTION'
  | 'HIGHLIGHT'
  | 'CLICK'
  | 'INPUT'
  | 'WAIT'
  | 'CONFIRMATION'
  | 'INFORMATION';

export interface StepAction {
  type: 'CLICK' | 'INPUT' | 'HOVER' | 'SCROLL' | 'WAIT';
  target: string;
  value?: string;
  timeout?: number;
}

export interface StepValidation {
  type: 'ELEMENT_EXISTS' | 'VALUE_CHANGED' | 'PAGE_CHANGED' | 'API_CALL';
  condition: string;
  timeout?: number;
}

export interface StepNavigation {
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
  nextStepId?: string;
  previousStepId?: string;
}