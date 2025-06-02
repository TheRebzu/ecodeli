import { create } from 'zustand';

interface ServiceState {
  services: any[];
  userServices: any[];
  setServices: (services: any[]) => void;
  setUserServices: (services: any[]) => void;
  addService: (service: any) => void;
  updateService: (id: string, updates: any) => void;
}

export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  userServices: [],
  setServices: (services) => set({ services }),
  setUserServices: (services) => set({ userServices: services }),
  addService: (service) => set((state) => ({
    services: [...state.services, service]
  })),
  updateService: (id, updates) => set((state) => ({
    services: state.services.map(s => s.id === id ? { ...s, ...updates } : s),
    userServices: state.userServices.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
})); 