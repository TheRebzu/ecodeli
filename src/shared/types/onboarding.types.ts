export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export interface OnboardingState {
  isComplete: boolean;
  currentStep: number;
  steps: OnboardingStep[];
}