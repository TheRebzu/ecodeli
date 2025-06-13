"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Package,
  GitBranch,
  Target,
  ShoppingCart,
  ShoppingBag,
  Users,
  Plane,
  Globe,
  Heart,
  Home,
  CheckCircle,
  Clock,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils/common";

// Types de livraison selon le cahier des charges
export interface DeliveryType {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  estimatedTime: string;
  priceRange: string;
  popular?: boolean;
  recommended?: boolean;
}

const DELIVERY_TYPES: DeliveryType[] = [
  {
    id: "PACKAGE_DELIVERY",
    label: "Livraison de colis",
    description: "Transport complet de votre colis de A à Z",
    icon: Package,
    features: [
      "Prise en charge complète",
      "Suivi en temps réel",
      "Assurance incluse",
    ],
    estimatedTime: "1-2 jours",
    priceRange: "5-25€",
    popular: true,
  },
  {
    id: "PARTIAL_DELIVERY",
    label: "Livraison partielle",
    description: "Le livreur prend en charge une partie du trajet",
    icon: GitBranch,
    features: ["Optimisation des trajets", "Prix réduit", "Écologique"],
    estimatedTime: "2-3 jours",
    priceRange: "3-15€",
  },
  {
    id: "FINAL_DISTRIBUTION",
    label: "Distribution finale",
    description: "Livraison depuis un point relais vers la destination",
    icon: Target,
    features: ["Dernier kilomètre", "Flexible", "Express possible"],
    estimatedTime: "Même jour",
    priceRange: "2-10€",
    recommended: true,
  },
  {
    id: "CART_DROP",
    label: "Lâcher de chariot",
    description: "Livraison depuis un commerçant partenaire",
    icon: ShoppingCart,
    features: [
      "Directement du magasin",
      "Fraîcheur garantie",
      "Créneaux horaires",
    ],
    estimatedTime: "2-4h",
    priceRange: "3-12€",
  },
  {
    id: "GROCERY_SHOPPING",
    label: "Courses alimentaires",
    description: "Le livreur fait vos courses et les livre",
    icon: ShoppingBag,
    features: ["Liste personnalisée", "Produits frais", "Choix du livreur"],
    estimatedTime: "3-6h",
    priceRange: "8-20€",
  },
  {
    id: "PERSON_TRANSPORT",
    label: "Transport de personnes",
    description: "Covoiturage et transport de passagers",
    icon: Users,
    features: ["Véhicule assuré", "Conducteur vérifié", "Prix fixe"],
    estimatedTime: "Immédiat",
    priceRange: "10-50€",
  },
  {
    id: "AIRPORT_TRANSFER",
    label: "Transfert aéroport",
    description: "Transport spécialisé vers/depuis l'aéroport",
    icon: Plane,
    features: ["Ponctualité garantie", "Suivi de vol", "Bagages inclus"],
    estimatedTime: "1-2h",
    priceRange: "20-80€",
  },
  {
    id: "FOREIGN_PURCHASE",
    label: "Achat à l'étranger",
    description: "Achat et livraison de produits indisponibles localement",
    icon: Globe,
    features: ["Produits exclusifs", "Douanes incluses", "Authentification"],
    estimatedTime: "5-15 jours",
    priceRange: "15-100€",
  },
  {
    id: "PET_CARE",
    label: "Transport d'animaux",
    description: "Transport sécurisé d'animaux de compagnie",
    icon: Heart,
    features: [
      "Transporteur qualifié",
      "Bien-être animal",
      "Assurance spéciale",
    ],
    estimatedTime: "1-3h",
    priceRange: "15-60€",
  },
  {
    id: "HOME_SERVICES",
    label: "Services à domicile",
    description: "Prestations de services chez vous",
    icon: Home,
    features: ["Prestataire vérifié", "Devis gratuit", "Garantie qualité"],
    estimatedTime: "1-4h",
    priceRange: "20-200€",
  },
];

interface DeliveryTypeSelectorProps {
  selectedType?: string;
  onTypeSelect: (typeId: string) => void;
  className?: string;
  showPricing?: boolean;
  compact?: boolean;
}

export const DeliveryTypeSelector: React.FC<DeliveryTypeSelectorProps> = ({
  selectedType,
  onTypeSelect,
  className,
  showPricing = true,
  compact = false,
}) => {
  const t = useTranslations("announcements");

  const handleTypeSelect = (typeId: string) => {
    onTypeSelect(typeId);
  };

  if (compact) {
    return (
      <div className={cn("space-y-4", className)}>
        <RadioGroup value={selectedType} onValueChange={handleTypeSelect}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DELIVERY_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;

              return (
                <div key={type.id} className="relative">
                  <RadioGroupItem
                    value={type.id}
                    id={type.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={type.id}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all",
                      isSelected && "border-primary bg-primary/5",
                    )}
                  >
                    <Icon
                      className={cn(
                        "mb-2 h-6 w-6",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <div className="text-center">
                      <div className="font-medium text-sm">{type.label}</div>
                      {showPricing && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {type.priceRange}
                        </div>
                      )}
                    </div>
                    {type.popular && (
                      <Badge
                        variant="secondary"
                        className="absolute -top-2 -right-2 text-xs"
                      >
                        Populaire
                      </Badge>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t("selectDeliveryType")}</h2>
        <p className="text-muted-foreground">
          {t("selectDeliveryTypeDescription")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DELIVERY_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <Card
              key={type.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50",
              )}
              onClick={() => handleTypeSelect(type.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{type.label}</CardTitle>
                      <CardDescription className="text-sm">
                        {type.description}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    {type.popular && (
                      <Badge variant="secondary" className="text-xs">
                        Populaire
                      </Badge>
                    )}
                    {type.recommended && (
                      <Badge variant="outline" className="text-xs">
                        Recommandé
                      </Badge>
                    )}
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Délai :</span>
                      <span className="font-medium">{type.estimatedTime}</span>
                    </div>
                    {showPricing && (
                      <div className="font-bold text-primary">
                        {type.priceRange}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {type.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 text-xs"
                      >
                        <Shield className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedType && (
        <div className="flex justify-center">
          <Button size="lg" className="min-w-[200px]">
            {t("continueWithType")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DeliveryTypeSelector;
