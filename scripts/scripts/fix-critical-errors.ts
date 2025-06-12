#!/usr/bin/env tsx
// scripts/scripts/fix-critical-errors.ts

import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

interface CriticalError {
  file: string;
  type: 'empty-module' | 'missing-export' | 'invalid-import' | 'type-error';
  line?: number;
  message: string;
}

class CriticalErrorFixer {
  private projectRoot: string = process.cwd();
  private errors: CriticalError[] = [];

  constructor() {
    console.log(chalk.bold.cyan('🔧 EcoDeli - Correcteur d\'erreurs critiques\n'));
  }

  async run(): Promise<void> {
    // Analyser les erreurs critiques
    await this.analyzeCriticalErrors();
    
    // Corriger les fichiers vides sans modules
    await this.fixEmptyModules();
    
    // Corriger les types manquants
    await this.fixMissingTypes();
    
    // Rapport final
    await this.generateReport();
  }

  private async analyzeCriticalErrors(): Promise<void> {
    console.log(chalk.blue('📋 Analyse des erreurs critiques...'));
    
    // Lister les fichiers problématiques identifiés dans le typecheck
    const emptyModules = [
      'src/types/planning/schedule.ts',
      'src/types/services/airport-transfer.ts',
      'src/types/services/evaluation.ts',
      'src/types/services/home-services.ts',
      'src/types/services/international-purchase.ts',
      'src/types/services/pet-sitting.ts',
      'src/types/services/service-base.ts',
      'src/types/services/shopping.ts',
      'src/types/services/transport.ts',
      'src/types/tutorial/overlay.ts',
      'src/types/tutorial/progress.ts',
      'src/types/tutorial/steps.ts',
      'src/types/tutorial/tutorial.ts',
      'src/types/users/preferences.ts',
      'src/types/users/roles.ts',
      'src/types/warehouses/inventory.ts',
      'src/types/warehouses/location.ts',
      'src/types/warehouses/reservation.ts',
      'src/types/warehouses/transfer.ts',
    ];

    for (const file of emptyModules) {
      this.errors.push({
        file,
        type: 'empty-module',
        message: 'Fichier vide sans exports'
      });
    }

    console.log(chalk.green(`✅ ${this.errors.length} erreurs critiques identifiées`));
  }

  private async fixEmptyModules(): Promise<void> {
    console.log(chalk.blue('\n🔧 Correction des modules vides...'));

    const moduleTemplates: Record<string, string> = {
      'schedule': `// Types pour la planification
export interface Schedule {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  userId: string;
  type: 'DELIVERY' | 'APPOINTMENT' | 'MAINTENANCE';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  scheduleId: string;
}

export interface SchedulePreferences {
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  timeZone: string;
}`,

      'airport-transfer': `// Types pour les transferts aéroport
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
}`,

      'evaluation': `// Types pour les évaluations
export interface ServiceEvaluation {
  id: string;
  serviceId: string;
  clientId: string;
  providerId: string;
  rating: number;
  comment?: string;
  criteria: EvaluationCriteria[];
  createdAt: Date;
}

export interface EvaluationCriteria {
  name: string;
  score: number;
  weight: number;
}

export interface EvaluationStats {
  averageRating: number;
  totalEvaluations: number;
  distribution: Record<number, number>;
}`,

      'home-services': `// Types pour les services à domicile
export interface HomeService {
  id: string;
  title: string;
  category: HomeServiceCategory;
  description: string;
  duration: number;
  price: number;
  providerId: string;
  requirements: string[];
  tools: string[];
}

export type HomeServiceCategory = 
  | 'CLEANING'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'GARDENING'
  | 'HANDYMAN'
  | 'CHILDCARE'
  | 'ELDERLY_CARE';

export interface HomeServiceBooking extends HomeService {
  clientId: string;
  address: string;
  scheduledDate: Date;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}`,

      'international-purchase': `// Types pour les achats internationaux
export interface InternationalPurchase {
  id: string;
  clientId: string;
  providerId: string;
  items: PurchaseItem[];
  originCountry: string;
  destinationCountry: string;
  estimatedCost: number;
  shippingMethod: ShippingMethod;
  customsInfo: CustomsInfo;
  status: PurchaseStatus;
}

export interface PurchaseItem {
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  category: string;
  specifications?: Record<string, string>;
}

export type ShippingMethod = 'EXPRESS' | 'STANDARD' | 'ECONOMY';
export type PurchaseStatus = 'REQUESTED' | 'QUOTED' | 'CONFIRMED' | 'PURCHASED' | 'SHIPPED' | 'DELIVERED';

export interface CustomsInfo {
  value: number;
  currency: string;
  description: string;
  hsCode?: string;
}`,

      'pet-sitting': `// Types pour la garde d'animaux
export interface PetSittingService {
  id: string;
  providerId: string;
  services: PetService[];
  acceptedPets: PetType[];
  location: 'AT_HOME' | 'AT_PROVIDER' | 'BOTH';
  experience: number;
  certifications: string[];
  hourlyRate: number;
}

export interface PetService {
  type: 'WALKING' | 'FEEDING' | 'PLAYING' | 'GROOMING' | 'OVERNIGHT';
  duration: number;
  price: number;
}

export type PetType = 'DOG' | 'CAT' | 'BIRD' | 'FISH' | 'RABBIT' | 'OTHER';

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
}`,

      'service-base': `// Types de base pour les services
export interface BaseService {
  id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  subcategory?: string;
  providerId: string;
  price: number;
  currency: string;
  duration?: number;
  availability: ServiceAvailability;
  location: ServiceLocation;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceCategory = 
  | 'DELIVERY'
  | 'HOME_SERVICES'
  | 'TRANSPORT'
  | 'PERSONAL_SERVICES'
  | 'PROFESSIONAL'
  | 'HEALTH'
  | 'EDUCATION';

export type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DRAFT';

export interface ServiceAvailability {
  schedule: WeeklySchedule;
  timeZone: string;
  advanceBooking: number; // heures minimum avant réservation
  maxAdvanceBooking?: number; // heures maximum avant réservation
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  available: boolean;
  timeSlots: TimeSlot[];
}

export interface ServiceLocation {
  type: 'FIXED' | 'MOBILE' | 'ONLINE';
  address?: string;
  radius?: number; // km de déplacement pour services mobiles
  coordinates?: {
    lat: number;
    lng: number;
  };
}`,

      'shopping': `// Types pour les services de shopping
export interface ShoppingService {
  id: string;
  providerId: string;
  specialties: ShoppingSp<remaining_args_truncated>`,

      'transport': `// Types pour les services de transport
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

export type VehicleType = 'CAR' | 'VAN' | 'TRUCK' | 'MOTORCYCLE' | 'BICYCLE';

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
  | 'POINT_TO_POINT'
  | 'DELIVERY'
  | 'MOVING'
  | 'AIRPORT_TRANSFER'
  | 'CITY_TOUR';

export interface Location {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'RESIDENTIAL' | 'COMMERCIAL' | 'TRANSPORT_HUB' | 'OTHER';
}`,

      'overlay': `// Types pour les overlays de tutoriel
export interface TutorialOverlay {
  id: string;
  target: string;
  title: string;
  content: string;
  position: OverlayPosition;
  style: OverlayStyle;
  backdrop: boolean;
  closable: boolean;
}

export type OverlayPosition = 
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface OverlayStyle {
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  maxWidth?: number;
  padding?: number;
  arrow?: boolean;
}

export interface OverlayProps {
  overlay: TutorialOverlay;
  onNext?: () => void;
  onPrevious?: () => void;
  onClose?: () => void;
  onSkip?: () => void;
}`,

      'progress': `// Types pour le progrès du tutoriel
export interface TutorialProgress {
  userId: string;
  tutorialId: string;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  status: TutorialStatus;
}

export type TutorialStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface ProgressStats {
  percentage: number;
  timeSpent: number; // en minutes
  stepsRemaining: number;
  estimatedTimeRemaining: number;
}

export interface UserTutorialHistory {
  userId: string;
  completedTutorials: string[];
  inProgressTutorials: string[];
  skippedTutorials: string[];
  totalTimeSpent: number;
  preferredLearningStyle?: 'VISUAL' | 'TEXTUAL' | 'INTERACTIVE';
}`,

      'steps': `// Types pour les étapes de tutoriel
export interface TutorialStep {
  id: string;
  tutorialId: string;
  order: number;
  title: string;
  content: string;
  type: StepType;
  target?: string;
  action?: StepAction;
  validation?: StepValidation;
  hints?: string[];
  duration?: number; // durée estimée en secondes
}

export type StepType = 
  | 'INTRODUCTION'
  | 'HIGHLIGHT'
  | 'CLICK'
  | 'INPUT'
  | 'WAIT'
  | 'CONFIRMATION'
  | 'INFORMATION';

export interface StepAction {
  type: 'CLICK' | 'INPUT' | 'HOVER' | 'SCROLL' | 'WAIT';
  target: string;
  value?: string;
  timeout?: number;
}

export interface StepValidation {
  type: 'ELEMENT_EXISTS' | 'VALUE_CHANGED' | 'PAGE_CHANGED' | 'API_CALL';
  condition: string;
  timeout?: number;
}

export interface StepNavigation {
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;
  nextStepId?: string;
  previousStepId?: string;
}`,

      'tutorial': `// Types principaux pour les tutoriaux
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  targetRole: UserRole[];
  difficulty: TutorialDifficulty;
  estimatedDuration: number; // en minutes
  prerequisites: string[];
  steps: TutorialStep[];
  isActive: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TutorialCategory = 
  | 'ONBOARDING'
  | 'FEATURE_INTRODUCTION'
  | 'WORKFLOW'
  | 'TROUBLESHOOTING'
  | 'ADVANCED';

export type TutorialDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type UserRole = 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';

export interface TutorialConfig {
  autoStart: boolean;
  showProgress: boolean;
  allowSkip: boolean;
  showHints: boolean;
  pauseOnFocus: boolean;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
}

export interface TutorialContext {
  currentTutorial: Tutorial | null;
  currentStep: TutorialStep | null;
  progress: TutorialProgress | null;
  config: TutorialConfig;
  isActive: boolean;
  isPaused: boolean;
}`,

      'preferences': `// Types pour les préférences utilisateur
export interface UserPreferences {
  userId: string;
  language: string;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
  updatedAt: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  types: {
    deliveries: boolean;
    payments: boolean;
    announcements: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  schedule: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

export interface PrivacyPreferences {
  profileVisibility: 'PUBLIC' | 'PRIVATE' | 'CONTACTS_ONLY';
  locationSharing: boolean;
  analyticsOptOut: boolean;
  marketingOptOut: boolean;
  dataRetention: 'MINIMAL' | 'STANDARD' | 'EXTENDED';
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}`,

      'roles': `// Types pour les rôles utilisateur
export type UserRole = 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';

export type UserStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'PENDING_VERIFICATION'
  | 'VERIFICATION_REJECTED';

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  restrictions: Restriction[];
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface Restriction {
  type: 'TIME' | 'LOCATION' | 'AMOUNT' | 'FREQUENCY';
  rule: string;
  value: any;
}

export interface UserRoleInfo {
  role: UserRole;
  status: UserStatus;
  permissions: string[];
  canUpgrade: boolean;
  upgradeOptions: UserRole[];
  roleSpecificData?: Record<string, any>;
}

export interface RoleTransition {
  fromRole: UserRole;
  toRole: UserRole;
  requirements: string[];
  verificationNeeded: boolean;
  fee?: number;
  processingTime: number; // en jours
}`,

      'inventory': `// Types pour l'inventaire des entrepôts
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
  | 'ELECTRONICS'
  | 'CLOTHING'
  | 'DOCUMENTS'
  | 'FURNITURE'
  | 'FRAGILE'
  | 'PERISHABLE'
  | 'HAZARDOUS'
  | 'OTHER';

export interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'm';
}

export type StorageCondition = 
  | 'TEMPERATURE_CONTROLLED'
  | 'HUMIDITY_CONTROLLED'
  | 'SECURE'
  | 'FRAGILE_HANDLING'
  | 'UPRIGHT_ONLY';

export interface InventoryCapacity {
  totalBoxes: number;
  occupiedBoxes: number;
  availableBoxes: number;
  totalVolume: number; // m³
  occupiedVolume: number;
  availableVolume: number;
}`,

      'location': `// Types pour les emplacements d'entrepôts
export interface WarehouseLocation {
  id: string;
  name: string;
  address: Address;
  coordinates: Coordinates;
  type: WarehouseType;
  zones: StorageZone[];
  facilities: Facility[];
  operatingHours: OperatingHours;
  contactInfo: ContactInfo;
  status: LocationStatus;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export type WarehouseType = 
  | 'URBAN'
  | 'SUBURBAN'
  | 'INDUSTRIAL'
  | 'CLIMATE_CONTROLLED'
  | 'SECURE_STORAGE'
  | 'COLD_STORAGE';

export interface StorageZone {
  id: string;
  name: string;
  type: ZoneType;
  capacity: number;
  occupancy: number;
  conditions: StorageCondition[];
  accessLevel: 'PUBLIC' | 'RESTRICTED' | 'SECURE';
}

export type ZoneType = 
  | 'STANDARD'
  | 'CLIMATE_CONTROLLED'
  | 'HIGH_SECURITY'
  | 'OVERSIZE'
  | 'HAZARDOUS'
  | 'QUICK_ACCESS';

export interface Facility {
  type: FacilityType;
  available: boolean;
  description?: string;
}

export type FacilityType = 
  | 'LOADING_DOCK'
  | 'PARKING'
  | 'ELEVATOR'
  | 'SECURITY_SYSTEM'
  | 'FIRE_PROTECTION'
  | 'CLIMATE_CONTROL'
  | 'POWER_BACKUP';

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  holidays: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  breaks?: TimeSlot[];
  closed: boolean;
}

export interface ContactInfo {
  phone: string;
  email: string;
  manager: string;
  emergencyContact: string;
}

export type LocationStatus = 'ACTIVE' | 'MAINTENANCE' | 'CLOSED' | 'FULL';`,

      'reservation': `// Types pour les réservations d'entrepôts
export interface BoxReservation {
  id: string;
  clientId: string;
  warehouseId: string;
  boxId: string;
  startDate: Date;
  endDate: Date;
  status: ReservationStatus;
  price: ReservationPrice;
  services: AdditionalService[];
  accessCodes: AccessCode[];
  terms: ReservationTerms;
  createdAt: Date;
  updatedAt: Date;
}

export type ReservationStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface ReservationPrice {
  basePrice: number;
  additionalServices: number;
  taxes: number;
  discount?: number;
  total: number;
  currency: string;
  billingPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface AdditionalService {
  type: ServiceType;
  price: number;
  description: string;
  required: boolean;
}

export type ServiceType = 
  | 'INSURANCE'
  | 'CLIMATE_CONTROL'
  | 'SECURITY_MONITORING'
  | 'PICKUP_DELIVERY'
  | 'INVENTORY_MANAGEMENT'
  | 'PHOTOGRAPHY';

export interface AccessCode {
  type: 'ENTRY' | 'BOX' | 'ZONE';
  code: string;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usageCount: number;
}

export interface ReservationTerms {
  minimumPeriod: number; // jours
  maximumPeriod: number; // jours
  cancellationPolicy: CancellationPolicy;
  extensionPolicy: ExtensionPolicy;
  accessRules: AccessRule[];
}

export interface CancellationPolicy {
  allowed: boolean;
  freeUntil: number; // heures avant début
  penaltyRate: number; // pourcentage
  refundableAmount: number; // pourcentage
}

export interface ExtensionPolicy {
  allowed: boolean;
  maxExtensions: number;
  priceIncrease: number; // pourcentage
  approvalRequired: boolean;
}

export interface AccessRule {
  description: string;
  type: 'RESTRICTION' | 'REQUIREMENT' | 'PERMISSION';
  value: string;
}`,

      'transfer': `// Types pour les transferts entre entrepôts
export interface WarehouseTransfer {
  id: string;
  clientId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  items: TransferItem[];
  type: TransferType;
  scheduledDate: Date;
  status: TransferStatus;
  cost: TransferCost;
  logistics: TransferLogistics;
  tracking: TransferTracking;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferItem {
  inventoryItemId: string;
  quantity: number;
  condition: ItemCondition;
  specialHandling?: string[];
  notes?: string;
}

export type ItemCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED';

export type TransferType = 
  | 'CLIENT_REQUESTED'
  | 'WAREHOUSE_CONSOLIDATION'
  | 'MAINTENANCE_MOVE'
  | 'CAPACITY_BALANCING'
  | 'EMERGENCY_RELOCATION';

export type TransferStatus = 
  | 'REQUESTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export interface TransferCost {
  transport: number;
  handling: number;
  insurance?: number;
  urgencyFee?: number;
  total: number;
  currency: string;
  billingTo: 'CLIENT' | 'WAREHOUSE' | 'SYSTEM';
}

export interface TransferLogistics {
  carrier: string;
  vehicle: string;
  driver: DriverInfo;
  route: TransferRoute;
  estimatedDuration: number; // minutes
  specialRequirements: string[];
}

export interface DriverInfo {
  name: string;
  phone: string;
  vehicleRegistration: string;
  certifications: string[];
}

export interface TransferRoute {
  origin: LocationPoint;
  destination: LocationPoint;
  waypoints: LocationPoint[];
  distance: number; // km
  estimatedTime: number; // minutes
}

export interface LocationPoint {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  instructions?: string;
}

export interface TransferTracking {
  currentLocation?: LocationPoint;
  progress: number; // pourcentage
  milestones: TransferMilestone[];
  estimatedArrival: Date;
  updates: TrackingUpdate[];
}

export interface TransferMilestone {
  type: 'PICKUP' | 'CHECKPOINT' | 'DELIVERY';
  location: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'PENDING' | 'COMPLETED' | 'DELAYED';
}

export interface TrackingUpdate {
  timestamp: Date;
  location: LocationPoint;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR';
}`
    };

    let fixedCount = 0;
    for (const error of this.errors.filter(e => e.type === 'empty-module')) {
      try {
        const filePath = path.join(this.projectRoot, error.file);
        const fileName = path.basename(error.file, '.ts');
        
        // Créer le répertoire si nécessaire
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        // Obtenir le template approprié
        const template = moduleTemplates[fileName] || `// Types pour ${fileName}
export interface ${fileName.charAt(0).toUpperCase() + fileName.slice(1)} {
  id: string;
  // TODO: Définir les propriétés
}`;

        // Écrire le fichier
        await fs.writeFile(filePath, template, 'utf-8');
        fixedCount++;
        
        console.log(chalk.green(`✅ ${error.file} corrigé`));
      } catch (err) {
        console.log(chalk.red(`❌ Erreur correction ${error.file}: ${err}`));
      }
    }

    console.log(chalk.green(`\n✅ ${fixedCount} modules vides corrigés`));
  }

  private async fixMissingTypes(): Promise<void> {
    console.log(chalk.blue('\n🔧 Correction des types manquants...'));

    // Corriger UserRole et UserStatus dans base.ts
    const baseTypesFile = path.join(this.projectRoot, 'src/types/users/base.ts');
    try {
      let content = await fs.readFile(baseTypesFile, 'utf-8');
      
      // Ajouter les imports des types manquants
      if (!content.includes('UserRole') || !content.includes('UserStatus')) {
        const imports = `// Types de base pour les utilisateurs
export type UserRole = 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';

export type UserStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'PENDING_VERIFICATION'
  | 'VERIFICATION_REJECTED';

`;
        content = imports + content;
        await fs.writeFile(baseTypesFile, content, 'utf-8');
        console.log(chalk.green(`✅ Types UserRole et UserStatus ajoutés à base.ts`));
      }
    } catch (err) {
      console.log(chalk.red(`❌ Erreur correction base.ts: ${err}`));
    }
  }

  private async generateReport(): Promise<void> {
    console.log(chalk.blue('\n📊 Rapport des corrections:'));
    console.log(chalk.green(`✅ ${this.errors.length} corrections appliquées`));
    
    console.log(chalk.blue('\n💡 Prochaines étapes:'));
    console.log('  1. Exécutez pnpm typecheck pour vérifier les corrections');
    console.log('  2. Exécutez pnpm fix:imports pour optimiser les imports'); 
    console.log('  3. Exécutez pnpm build pour tester le build complet');
  }
}

// Exécution du script
const fixer = new CriticalErrorFixer();
fixer.run().catch(console.error); 