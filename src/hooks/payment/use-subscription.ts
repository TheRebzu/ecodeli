import { api } from '@/hooks/system/use-trpc';

export function useSubscription() {
  const { data: userPlan, isLoading } = api.subscription.getUserPlan.useQuery();
  const { data: availablePlans } = api.subscription.getAvailablePlans.useQuery();
  
  const subscribeMutation = api.subscription.subscribeToPlan.useMutation();
  const cancelMutation = api.subscription.cancelSubscription.useMutation();
  
  const subscribe = (planId: string, paymentMethodId?: string) => {
    return subscribeMutation.mutateAsync({ planId, paymentMethodId });
  };
  
  const cancel = () => {
    return cancelMutation.mutateAsync();
  };
  
  return {
    currentPlan: userPlan,
    availablePlans,
    isLoading,
    subscribe,
    cancel,
    isSubscribing: subscribeMutation.isLoading,
    isCancelling: cancelMutation.isLoading,
  };
}