import { create } from 'zustand';

interface SubscriptionState {
  currentPlan: any | null;
  availablePlans: any[];
  setCurrentPlan: (plan: any | null) => void;
  setAvailablePlans: (plans: any[]) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  currentPlan: null,
  availablePlans: [],
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  setAvailablePlans: (plans) => set({ availablePlans: plans }),
})); 