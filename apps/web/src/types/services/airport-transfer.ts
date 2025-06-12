// Types pour les transferts aéroport
export interface AirportTransfer {
  id: string;
  origin: string;
  destination: string;
  flightNumber?: string;
  passengerCount: number;
  luggageCount: number;
  vehicleType: 'ECONOMY' | 'COMFORT' | 'LUXURY';
  scheduledTime: Date;
  price: number;
}

export interface AirportInfo {
  code: string;
  name: string;
  city: string;
  terminals: string[];
}