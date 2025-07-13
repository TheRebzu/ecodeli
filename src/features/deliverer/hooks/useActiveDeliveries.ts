import { useState, useEffect } from "react";

// Type pour les livraisons actives
export interface ActiveDelivery {
  id: string;
  announcement: {
    title: string;
    description: string;
  };
  pickupAddress: string;
  deliveryAddress: string;
  scheduledPickupDate: Date | string;
  scheduledDeliveryDate: Date | string;
  status: string;
  price: number;
  validationCode: string;
  client: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

export function useActiveDeliveries() {
  const [deliveries, setDeliveries] = useState<ActiveDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/deliverer/deliveries/active");

      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.data || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors du chargement des livraisons");
        setDeliveries([]);
      }
    } catch (err) {
      console.error("Error fetching active deliveries:", err);
      setError("Erreur lors du chargement des livraisons");
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveDeliveries();
  }, []);

  return { deliveries, loading, error, refetch: fetchActiveDeliveries };
}
