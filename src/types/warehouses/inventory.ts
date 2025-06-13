// Types pour l'inventaire des entrepôts
export interface WarehouseInventory {
  warehouseId: string;
  items: InventoryItem[];
  capacity: InventoryCapacity;
  utilization: number; // pourcentage d'utilisation
  lastUpdated: Date;
}

export interface InventoryItem {
  id: string;
  clientId: string;
  boxId: string;
  description: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  value?: number;
  dimensions?: Dimensions;
  weight?: number;
  storageConditions: StorageCondition[];
  entryDate: Date;
  expiryDate?: Date;
  tags: string[];
}

export type ItemCategory =
  | "ELECTRONICS"
  | "CLOTHING"
  | "DOCUMENTS"
  | "FURNITURE"
  | "FRAGILE"
  | "PERISHABLE"
  | "HAZARDOUS"
  | "OTHER";

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "m";
}

export type StorageCondition =
  | "TEMPERATURE_CONTROLLED"
  | "HUMIDITY_CONTROLLED"
  | "SECURE"
  | "FRAGILE_HANDLING"
  | "UPRIGHT_ONLY";

export interface InventoryCapacity {
  totalBoxes: number;
  occupiedBoxes: number;
  availableBoxes: number;
  totalVolume: number; // m³
  occupiedVolume: number;
  availableVolume: number;
}
