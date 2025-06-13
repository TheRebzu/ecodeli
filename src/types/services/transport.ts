// Types pour les services de transport
export interface TransportService {
  id: string;
  providerId: string;
  vehicleType: VehicleType;
  capacity: VehicleCapacity;
  routes: TransportRoute[];
  pricePerKm: number;
  minimumFare: number;
  availableServices: TransportServiceType[];
}

export type VehicleType = "CAR" | "VAN" | "TRUCK" | "MOTORCYCLE" | "BICYCLE";

export interface VehicleCapacity {
  passengers: number;
  luggage: number; // litres
  weight: number; // kg
}

export interface TransportRoute {
  id: string;
  name: string;
  origin: Location;
  destination: Location;
  distance: number;
  estimatedDuration: number;
  price: number;
}

export type TransportServiceType =
  | "POINT_TO_POINT"
  | "DELIVERY"
  | "MOVING"
  | "AIRPORT_TRANSFER"
  | "CITY_TOUR";

export interface Location {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: "RESIDENTIAL" | "COMMERCIAL" | "TRANSPORT_HUB" | "OTHER";
}
