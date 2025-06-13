"use client";

import { useState, useEffect } from "react";
// import { api } from "@/trpc/react";

// Types
interface Service {
  id: string;
  title: string;
  description?: string;
  category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  price: number;
  priceType: "FIXED" | "HOURLY" | "DAILY" | "CUSTOM";
  duration: number;
  location: "AT_CUSTOMER" | "AT_PROVIDER" | "REMOTE" | "FLEXIBLE";
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "SUSPENDED";
  images?: string[];
  rating: number;
  totalReviews: number;
  totalBookings: number;
  monthlyRevenue: number;
  isEmergencyService: boolean;
  requiresEquipment: boolean;
  maxClients: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface UseProviderServicesOptions {
  status?: string;
  category?: string;
  location?: string;
  priceType?: string;
  search?: string;
  emergencyOnly?: boolean;
  equipmentOnly?: boolean;
}

interface UseProviderServicesResult {
  services: Service[];
  categories: ServiceCategory[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  updateServiceStatus: (id: string, status: string) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  duplicateService: (id: string) => Promise<Service>;
}

// Mock data pour le développement
const mockCategories: ServiceCategory[] = [
  { id: "1", name: "Ménage et nettoyage", icon: "🧹", color: "#3B82F6" },
  { id: "2", name: "Jardinage", icon: "🌱", color: "#10B981" },
  { id: "3", name: "Bricolage", icon: "🔧", color: "#F59E0B" },
  { id: "4", name: "Livraison", icon: "📦", color: "#8B5CF6" },
  { id: "5", name: "Cours particuliers", icon: "📚", color: "#EF4444" },
  { id: "6", name: "Soins à domicile", icon: "🏥", color: "#06B6D4" },
];

const mockServices: Service[] = [
  {
    id: "1",
    title: "Nettoyage complet de maison",
    description:
      "Service de nettoyage professionnel pour votre domicile, incluant toutes les pièces et surfaces.",
    category: mockCategories[0],
    price: 35,
    priceType: "HOURLY",
    duration: 120,
    location: "AT_CUSTOMER",
    status: "ACTIVE",
    images: ["/services/cleaning1.jpg", "/services/cleaning2.jpg"],
    rating: 4.8,
    totalReviews: 127,
    totalBookings: 203,
    monthlyRevenue: 2850,
    isEmergencyService: false,
    requiresEquipment: true,
    maxClients: 1,
    createdAt: new Date(2024, 0, 15),
    updatedAt: new Date(2024, 10, 10),
  },
  {
    id: "2",
    title: "Entretien jardin et pelouse",
    description:
      "Tonte, taille des haies, désherbage et entretien général de votre espace vert.",
    category: mockCategories[1],
    price: 45,
    priceType: "HOURLY",
    duration: 180,
    location: "AT_CUSTOMER",
    status: "ACTIVE",
    images: [
      "/services/garden1.jpg",
      "/services/garden2.jpg",
      "/services/garden3.jpg",
    ],
    rating: 4.9,
    totalReviews: 89,
    totalBookings: 156,
    monthlyRevenue: 1980,
    isEmergencyService: false,
    requiresEquipment: true,
    maxClients: 1,
    createdAt: new Date(2024, 1, 20),
    updatedAt: new Date(2024, 10, 5),
  },
  {
    id: "3",
    title: "Réparations urgentes",
    description:
      "Service d'urgence 24h/24 pour réparations d'électricité, plomberie et serrurerie.",
    category: mockCategories[2],
    price: 80,
    priceType: "FIXED",
    duration: 60,
    location: "AT_CUSTOMER",
    status: "ACTIVE",
    images: ["/services/repair1.jpg"],
    rating: 4.6,
    totalReviews: 234,
    totalBookings: 145,
    monthlyRevenue: 3200,
    isEmergencyService: true,
    requiresEquipment: true,
    maxClients: 1,
    createdAt: new Date(2024, 2, 10),
    updatedAt: new Date(2024, 10, 12),
  },
  {
    id: "4",
    title: "Livraison express courses",
    description:
      "Livraison rapide de vos courses et produits alimentaires en moins de 2h.",
    category: mockCategories[3],
    price: 15,
    priceType: "FIXED",
    duration: 30,
    location: "AT_CUSTOMER",
    status: "INACTIVE",
    rating: 4.3,
    totalReviews: 67,
    totalBookings: 89,
    monthlyRevenue: 450,
    isEmergencyService: false,
    requiresEquipment: false,
    maxClients: 3,
    createdAt: new Date(2024, 3, 5),
    updatedAt: new Date(2024, 9, 20),
  },
  {
    id: "5",
    title: "Cours de mathématiques",
    description:
      "Cours particuliers de mathématiques pour tous niveaux, du primaire au lycée.",
    category: mockCategories[4],
    price: 25,
    priceType: "HOURLY",
    duration: 60,
    location: "FLEXIBLE",
    status: "DRAFT",
    rating: 4.7,
    totalReviews: 45,
    totalBookings: 78,
    monthlyRevenue: 875,
    isEmergencyService: false,
    requiresEquipment: false,
    maxClients: 1,
    createdAt: new Date(2024, 4, 12),
    updatedAt: new Date(2024, 10, 1),
  },
];

export function useProviderServices(
  options: UseProviderServicesOptions = {},
): UseProviderServicesResult {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Remplacer par l'appel API réel
      // const result = await api.provider.providerServices.getServices.query(options);

      // Simulation d'un délai d'API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Filtrer les données mock selon les options
      let filteredServices = [...mockServices];

      if (options.status && options.status !== "all") {
        filteredServices = filteredServices.filter(
          (service) => service.status === options.status,
        );
      }

      if (options.category && options.category !== "all") {
        filteredServices = filteredServices.filter(
          (service) => service.category.id === options.category,
        );
      }

      if (options.location && options.location !== "all") {
        filteredServices = filteredServices.filter(
          (service) => service.location === options.location,
        );
      }

      if (options.priceType && options.priceType !== "all") {
        filteredServices = filteredServices.filter(
          (service) => service.priceType === options.priceType,
        );
      }

      if (options.emergencyOnly) {
        filteredServices = filteredServices.filter(
          (service) => service.isEmergencyService,
        );
      }

      if (options.equipmentOnly) {
        filteredServices = filteredServices.filter(
          (service) => service.requiresEquipment,
        );
      }

      if (options.search) {
        const searchLower = options.search.toLowerCase();
        filteredServices = filteredServices.filter(
          (service) =>
            service.title.toLowerCase().includes(searchLower) ||
            service.description?.toLowerCase().includes(searchLower) ||
            service.category.name.toLowerCase().includes(searchLower),
        );
      }

      // Trier par date de mise à jour (plus récent en premier)
      filteredServices.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      );

      setServices(filteredServices);
      setCategories(mockCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const updateServiceStatus = async (id: string, status: string) => {
    try {
      // TODO: Remplacer par l'appel API réel
      // await api.provider.providerServices.updateStatus.mutate({ id, status });

      // Simulation
      await new Promise((resolve) => setTimeout(resolve, 500));

      setServices((prev) =>
        prev.map((service) =>
          service.id === id
            ? { ...service, status: status as any, updatedAt: new Date() }
            : service,
        ),
      );
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour du statut",
      );
    }
  };

  const deleteService = async (id: string) => {
    try {
      // TODO: Remplacer par l'appel API réel
      // await api.provider.providerServices.deleteService.mutate({ id });

      // Simulation
      await new Promise((resolve) => setTimeout(resolve, 500));

      setServices((prev) => prev.filter((service) => service.id !== id));
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Erreur lors de la suppression",
      );
    }
  };

  const duplicateService = async (id: string): Promise<Service> => {
    try {
      // TODO: Remplacer par l'appel API réel
      // const result = await api.provider.providerServices.duplicateService.mutate({ id });

      // Simulation
      await new Promise((resolve) => setTimeout(resolve, 500));

      const originalService = services.find((s) => s.id === id);
      if (!originalService) {
        throw new Error("Service non trouvé");
      }

      const duplicatedService: Service = {
        ...originalService,
        id: `${id}-copy-${Date.now()}`,
        title: `${originalService.title} (Copie)`,
        status: "DRAFT",
        totalBookings: 0,
        totalReviews: 0,
        rating: 0,
        monthlyRevenue: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setServices((prev) => [duplicatedService, ...prev]);

      return duplicatedService;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "Erreur lors de la duplication",
      );
    }
  };

  const refetch = () => {
    fetchServices();
  };

  useEffect(() => {
    fetchServices();
  }, [
    options.status,
    options.category,
    options.location,
    options.priceType,
    options.search,
    options.emergencyOnly,
    options.equipmentOnly,
  ]);

  return {
    services,
    categories,
    isLoading,
    error,
    refetch,
    updateServiceStatus,
    deleteService,
    duplicateService,
  };
}
