import { PackageType, InsuranceOption } from '@/shared/types/announcement.types';
import { calculateDistance } from '@/lib/utils/geo';

const BASE_PRICE_PER_KM = 0.5;
const WEIGHT_MULTIPLIER = 0.2;
const FRAGILE_MULTIPLIER = 1.3;
const REFRIGERATED_MULTIPLIER = 1.5;

interface PriceCalculationParams {
  packageType: PackageType;
  weight: number;
  isFragile: boolean;
  requiresRefrigeration: boolean;
  pickupCoordinates: { lat: number; lng: number };
  deliveryCoordinates: { lat: number; lng: number };
  declaredValue?: number;
}

interface PriceRecommendation {
  basePrice: number;
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  insuranceOptions: {
    type: InsuranceOption;
    price: number;
    coverage: number;
  }[];
  serviceFees: {
    platformFee: number;
    insuranceFee: number;
    taxRate: number;
    totalFees: number;
  };
}

export function calculateRecommendedPrice(params: PriceCalculationParams): PriceRecommendation {
  const {
    packageType,
    weight,
    isFragile,
    requiresRefrigeration,
    pickupCoordinates,
    deliveryCoordinates,
    declaredValue
  } = params;

  // Calcul de la distance
  const distance = calculateDistance(
    pickupCoordinates.lat,
    pickupCoordinates.lng,
    deliveryCoordinates.lat,
    deliveryCoordinates.lng
  );

  // Prix de base selon la distance
  let basePrice = distance * BASE_PRICE_PER_KM;

  // Ajustement selon le poids
  basePrice += weight * WEIGHT_MULTIPLIER;

  // Multiplicateurs selon le type de colis
  switch (packageType) {
    case PackageType.SMALL:
      basePrice *= 1;
      break;
    case PackageType.MEDIUM:
      basePrice *= 1.2;
      break;
    case PackageType.LARGE:
      basePrice *= 1.5;
      break;
    case PackageType.EXTRA_LARGE:
      basePrice *= 2;
      break;
  }

  // Ajustements pour conditions spéciales
  if (isFragile) basePrice *= FRAGILE_MULTIPLIER;
  if (requiresRefrigeration) basePrice *= REFRIGERATED_MULTIPLIER;

  // Calcul des fourchettes de prix
  const minPrice = Math.max(10, basePrice * 0.8);
  const maxPrice = basePrice * 1.4;
  const recommendedPrice = Math.round(basePrice * 100) / 100;

  // Calcul des options d'assurance
  const insuranceOptions = calculateInsuranceOptions(declaredValue || recommendedPrice);

  // Calcul des frais de service
  const serviceFees = calculateServiceFees(recommendedPrice);

  return {
    basePrice: Math.round(basePrice * 100) / 100,
    recommendedPrice,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100,
    insuranceOptions,
    serviceFees,
  };
}

function calculateInsuranceOptions(value: number) {
  return [
    {
      type: InsuranceOption.NONE,
      price: 0,
      coverage: 0
    },
    {
      type: InsuranceOption.BASIC,
      price: Math.max(5, value * 0.02),
      coverage: Math.min(500, value)
    },
    {
      type: InsuranceOption.PREMIUM,
      price: Math.max(10, value * 0.04),
      coverage: value
    }
  ];
}

function calculateServiceFees(price: number) {
  const platformFee = Math.max(2, price * 0.1);
  const taxRate = 0.2; // 20% TVA
  const totalFees = platformFee * (1 + taxRate);

  return {
    platformFee: Math.round(platformFee * 100) / 100,
    insuranceFee: 0, // Calculé séparément
    taxRate,
    totalFees: Math.round(totalFees * 100) / 100
  };
} 