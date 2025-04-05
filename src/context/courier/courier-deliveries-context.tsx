'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CourierDelivery } from '@/shared/types/courier/delivery.types';

type CourierDeliveriesContextType = {
  deliveries: CourierDelivery[];
  activeDeliveries: CourierDelivery[];
  pendingDeliveries: CourierDelivery[];
  completedDeliveries: CourierDelivery[];
  isLoading: boolean;
  error: any;
  refreshDeliveries: () => Promise<void>;
};

const CourierDeliveriesContext = createContext<CourierDeliveriesContextType | undefined>(undefined);

export function CourierDeliveriesProvider({ children }: { children: ReactNode }) {
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeDeliveries = deliveries.filter(d => d.status === 'active');
  const pendingDeliveries = deliveries.filter(d => d.status === 'pending');
  const completedDeliveries = deliveries.filter(d => d.status === 'completed');

  const refreshDeliveries = async () => {
    try {
      setIsLoading(true);
      // This would be an API call in a real application
      setDeliveries([]);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CourierDeliveriesContext.Provider value={{
      deliveries,
      activeDeliveries,
      pendingDeliveries,
      completedDeliveries,
      isLoading,
      error,
      refreshDeliveries
    }}>
      {children}
    </CourierDeliveriesContext.Provider>
  );
}

export function useCourierDeliveriesContext() {
  const context = useContext(CourierDeliveriesContext);
  if (context === undefined) {
    throw new Error('useCourierDeliveriesContext must be used within a CourierDeliveriesProvider');
  }
  return context;
}