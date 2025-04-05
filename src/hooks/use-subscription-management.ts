'use client';

export function useSubscriptionManagement() {
  // Hook en cours de développement
  return {
    currentPlan: 'free',
    isSubscriptionActive: false,
    expirationDate: null,
    changePlan: (plan: string) => console.log('Change plan', plan),
    cancelSubscription: () => console.log('Cancel subscription'),
  };
}