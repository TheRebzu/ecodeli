"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Truck, 
  Package, 
  Store, 
  Wrench, 
  User,
  ShoppingCart,
  ArrowRight,
  Check,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@prisma/client";

interface RegisterTypeSelectorProps {
  onTypeSelect: (userType: UserRole) => void;
  selectedType?: UserRole;
  className?: string;
}

interface UserTypeOption {
  type: UserRole;
  title: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  isPopular?: boolean;
}

/**
 * Composant de sélection du type d'utilisateur lors de l'inscription
 * Implémentation selon la Mission 1 - Gestion des rôles utilisateur
 */
export default function RegisterTypeSelector({
  onTypeSelect,
  selectedType,
  className
}: RegisterTypeSelectorProps) {
  const t = useTranslations("auth.register");
  const [hoveredType, setHoveredType] = useState<UserRole | null>(null);

  const userTypes: UserTypeOption[] = [
    {
      type: "CLIENT",
      title: t("types.client.title"),
      description: t("types.client.description"),
      features: [
        t("types.client.features.orders"),
        t("types.client.features.tracking"),
        t("types.client.features.services"),
        t("types.client.features.storage")
      ],
      icon: User,
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200",
      isPopular: true
    },
    {
      type: "DELIVERER",
      title: t("types.deliverer.title"),
      description: t("types.deliverer.description"),
      features: [
        t("types.deliverer.features.delivery"),
        t("types.deliverer.features.income"),
        t("types.deliverer.features.flexible"),
        t("types.deliverer.features.tracking")
      ],
      icon: Truck,
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200"
    },
    {
      type: "MERCHANT",
      title: t("types.merchant.title"),
      description: t("types.merchant.description"),
      features: [
        t("types.merchant.features.business"),
        t("types.merchant.features.cartdrop"),
        t("types.merchant.features.analytics"),
        t("types.merchant.features.integration")
      ],
      icon: Store,
      color: "text-purple-600",
      bgColor: "bg-purple-50 border-purple-200"
    },
    {
      type: "PROVIDER",
      title: t("types.provider.title"),
      description: t("types.provider.description"),
      features: [
        t("types.provider.features.services"),
        t("types.provider.features.appointments"),
        t("types.provider.features.reputation"),
        t("types.provider.features.billing")
      ],
      icon: Wrench,
      color: "text-orange-600",
      bgColor: "bg-orange-50 border-orange-200"
    }
  ];

  const handleTypeSelect = (type: UserRole) => {
    onTypeSelect(type);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* En-tête */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("selectType.title")}
        </h2>
        <p className="text-gray-600">
          {t("selectType.subtitle")}
        </p>
      </div>

      {/* Grille des options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {userTypes.map((userType) => {
          const Icon = userType.icon;
          const isSelected = selectedType === userType.type;
          const isHovered = hoveredType === userType.type;

          return (
            <Card
              key={userType.type}
              className={cn(
                "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
                isSelected 
                  ? "ring-2 ring-blue-500 shadow-md" 
                  : "hover:ring-1 hover:ring-gray-300",
                userType.bgColor
              )}
              onMouseEnter={() => setHoveredType(userType.type)}
              onMouseLeave={() => setHoveredType(null)}
              onClick={() => handleTypeSelect(userType.type)}
            >
              {/* Badge populaire */}
              {userType.isPopular && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-yellow-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    {t("popular")}
                  </Badge>
                </div>
              )}

              {/* Indicateur de sélection */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="rounded-full bg-blue-500 p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isSelected ? "bg-blue-100" : "bg-white"
                  )}>
                    <Icon className={cn("h-6 w-6", userType.color)} />
                  </div>
                  <span className="text-lg font-semibold">
                    {userType.title}
                  </span>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">
                  {userType.description}
                </p>

                {/* Liste des fonctionnalités */}
                <ul className="space-y-2">
                  {userType.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className={cn(
                        "rounded-full p-1",
                        isSelected ? "bg-blue-100" : "bg-white"
                      )}>
                        <Check className={cn("h-3 w-3", userType.color)} />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Bouton de sélection */}
                <Button
                  className={cn(
                    "w-full mt-4 transition-all duration-200",
                    isSelected
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                  onClick={() => handleTypeSelect(userType.type)}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {t("selected")}
                    </>
                  ) : (
                    <>
                      {t("selectThis")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Information supplémentaire */}
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {t("selectType.note")}
        </p>
      </div>
    </div>
  );
}
