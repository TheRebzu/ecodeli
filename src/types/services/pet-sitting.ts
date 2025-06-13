// Types pour la garde d'animaux
export interface PetSittingService {
  id: string;
  providerId: string;
  services: PetService[];
  acceptedPets: PetType[];
  location: "AT_HOME" | "AT_PROVIDER" | "BOTH";
  experience: number;
  certifications: string[];
  hourlyRate: number;
}

export interface PetService {
  type: "WALKING" | "FEEDING" | "PLAYING" | "GROOMING" | "OVERNIGHT";
  duration: number;
  price: number;
}

export type PetType = "DOG" | "CAT" | "BIRD" | "FISH" | "RABBIT" | "OTHER";

export interface PetSittingBooking {
  id: string;
  petSittingServiceId: string;
  clientId: string;
  pets: Pet[];
  startDate: Date;
  endDate: Date;
  services: PetService[];
  specialInstructions?: string;
  emergencyContact: string;
}

export interface Pet {
  name: string;
  type: PetType;
  breed?: string;
  age: number;
  weight?: number;
  specialNeeds?: string[];
}
