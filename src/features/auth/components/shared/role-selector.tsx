"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Truck, Store, Settings, CheckCircle } from "lucide-react";
import { Role } from "@/lib/auth/config";

interface RoleSelectorProps {
  selectedRole?: Role;
  onRoleSelect: (role: Role) => void;
  disabled?: boolean;
}

const roleOptions = [
  {
    role: "CLIENT" as Role,
    icon: User,
    title: "Client",
    description: "Je veux envoyer des colis ou réserver des services",
    features: [
      "Dépôt d'annonces de livraison",
      "Réservation de services à domicile",
      "Suivi des livraisons en temps réel",
      "Accès aux box de stockage",
    ],
    popular: true,
  },
  {
    role: "DELIVERER" as Role,
    icon: Truck,
    title: "Livreur",
    description: "Je veux livrer des colis et gagner de l'argent",
    features: [
      "Livraisons sur mes trajets",
      "Portefeuille et paiements",
      "Carte NFC après validation",
      "Gestion des disponibilités",
    ],
    validation: "Documents requis",
  },
  {
    role: "MERCHANT" as Role,
    icon: Store,
    title: "Commerçant",
    description: "Je veux proposer mes produits et services",
    features: [
      "Lâcher de chariot",
      "Gestion des commandes",
      "Facturation automatique",
      "Contrat avec EcoDeli",
    ],
    validation: "Contrat requis",
  },
  {
    role: "PROVIDER" as Role,
    icon: Settings,
    title: "Prestataire",
    description: "Je propose des services à la personne",
    features: [
      "Services à domicile",
      "Calendrier de réservations",
      "Facturation mensuelle",
      "Certifications validées",
    ],
    validation: "Certifications requises",
  },
];

/**
 * Composant de sélection de rôle pour l'inscription
 * Interface moderne avec preview des fonctionnalités
 */
export function RoleSelector({
  selectedRole,
  onRoleSelect,
  disabled = false,
}: RoleSelectorProps) {
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null);

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Choisissez votre profil</h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez le type de compte qui correspond à vos besoins
        </p>
      </div>

      <div className="grid gap-4">
        {roleOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedRole === option.role;
          const isHovered = hoveredRole === option.role;

          return (
            <Card
              key={option.role}
              className={`
                cursor-pointer transition-all duration-200 relative
                ${isSelected ? "ring-2 ring-green-500 bg-green-50" : "hover:shadow-md"}
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
              onClick={() => !disabled && onRoleSelect(option.role)}
              onMouseEnter={() => !disabled && setHoveredRole(option.role)}
              onMouseLeave={() => setHoveredRole(null)}
            >
              {/* Badge populaire */}
              {option.popular && (
                <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs">
                  Populaire
                </Badge>
              )}

              {/* Icône de sélection */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${isSelected ? "bg-green-600" : "bg-gray-100"}
                  `}
                  >
                    <Icon
                      className={`h-5 w-5 ${isSelected ? "text-white" : "text-gray-600"}`}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-base">{option.title}</CardTitle>
                    {option.validation && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {option.validation}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <CardDescription className="mb-3">
                  {option.description}
                </CardDescription>

                {/* Fonctionnalités en aperçu */}
                {(isSelected || isHovered) && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Fonctionnalités incluses :
                    </p>
                    {option.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center text-xs text-gray-600"
                      >
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedRole && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Profil sélectionné :</strong>{" "}
            {roleOptions.find((r) => r.role === selectedRole)?.title}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Vous pourrez toujours contacter le support pour modifier votre
            profil après l'inscription.
          </p>
        </div>
      )}
    </div>
  );
}
