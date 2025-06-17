"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Euro,
  Calculator,
  Percent,
  Calendar,
  TrendingDown,
  Gift,
  Info,
  Check} from "lucide-react";
import { api } from "@/trpc/react";
import { useClientStorage } from "@/hooks/client/use-client-storage";
import { useToast } from "@/components/ui/use-toast";

type OptimalPricingCalculatorProps = {
  boxId: string;
  startDate: Date;
  endDate: Date;
  onPriceCalculated?: (pricing: any) => void;
  className?: string;
};

export function OptimalPricingCalculator({
  boxId,
  startDate,
  endDate,
  onPriceCalculated,
  className = ""}: OptimalPricingCalculatorProps) {
  const { data } = useSession();
  const { toast } = useToast();
  const { createReservation, isCreatingReservation } = useClientStorage({
    onReservationSuccess: (reservation) => {
      toast({
        title: "Réservation créée avec succès",
        description: `Votre réservation a été confirmée. Référence: ${reservation.id}`,
        variant: "default",
      });
    },
  });

  // Calcul du prix optimal
  const {
    data: pricing,
    isLoading,
    error} = api.clientStorageBoxes.calculateOptimalPricing.useQuery(
    {
      boxId,
      startDate,
      endDate},
    {
      enabled: !!data?.user?.id && !!boxId && !!startDate && !!endDate,
      refetchOnWindowFocus: false},
  );

  useEffect(() => {
    if (pricing && onPriceCalculated) {
      onPriceCalculated(pricing);
    }
  }, [pricing, onPriceCalculated]);

  if (!data?.user?.id) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            Connectez-vous pour voir le calcul de prix
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calcul du prix optimal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error || !pricing) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calcul du prix optimal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Erreur lors du calcul du prix
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasDiscounts = pricing.discounts && pricing.discounts.length > 0;
  const totalSavings = pricing.totalDiscounts || 0;
  const savingsPercentage =
    pricing.basePrice > 0 ? (totalSavings / pricing.basePrice) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Calcul du prix optimal
        </CardTitle>
        <CardDescription>
          Prix personnalisé basé sur votre profil client
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Résumé principal */}
        <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Euro className="h-6 w-6 text-primary" />
              <span className="text-3xl font-bold text-primary">
                {pricing.finalPrice.toFixed(2)}€
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Prix total TTC pour {pricing.days} jour
              {pricing.days > 1 ? "s" : ""}
            </div>

            {hasDiscounts && (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">
                  Vous économisez {totalSavings.toFixed(2)}€ (
                  {savingsPercentage.toFixed(0)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Détail des prix */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Prix de base</span>
            <span className="font-medium">{pricing.basePrice.toFixed(2)}€</span>
          </div>

          {/* Remises appliquées */}
          {hasDiscounts && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <Gift className="h-4 w-4" />
                  Remises appliquées
                </div>
                {pricing.discounts.map((discount: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>{discount.description}</span>
                    </div>
                    <span className="text-green-600 font-medium">
                      -{discount.amount.toFixed(2)}€
                    </span>
                  </div>
                ))}
              </div>
              <Separator />
            </>
          )}

          {/* Sous-total et TVA */}
          <div className="flex justify-between items-center">
            <span>Prix HT</span>
            <span className="font-medium">
              {pricing.priceBeforeVat.toFixed(2)}€
            </span>
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>TVA (20%)</span>
            <span>{pricing.vatAmount.toFixed(2)}€</span>
          </div>

          <Separator />

          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total TTC</span>
            <span>{pricing.finalPrice.toFixed(2)}€</span>
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Prix par jour :</span>{" "}
                {pricing.pricePerDay.toFixed(2)}€
              </div>
              <div>
                <span className="font-medium">Durée :</span> {pricing.days} jour
                {pricing.days > 1 ? "s" : ""}
              </div>
              {hasDiscounts && (
                <div className="text-green-600">
                  <span className="font-medium">Économies totales :</span>{" "}
                  {totalSavings.toFixed(2)}€
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Types de remises disponibles */}
        {!hasDiscounts && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Percent className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="space-y-1 text-sm">
                <div className="font-medium text-blue-700">
                  Comment économiser davantage ?
                </div>
                <ul className="text-blue-600 space-y-1">
                  <li>• Réservez 14 jours à l'avance (5% de remise)</li>
                  <li>• Réservez pour 14+ jours (5% de remise)</li>
                  <li>• Réservez pour 30+ jours (10% de remise)</li>
                  <li>
                    • Effectuez plus de réservations (jusqu'à 15% de fidélité)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.print()}
          >
            Imprimer le devis
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              createReservation({
                boxId,
                startDate,
                endDate,
                notes: `Réservation avec prix optimal: ${pricing.finalPrice.toFixed(2)}€`,
              });
            }}
            disabled={isCreatingReservation}
          >
            {isCreatingReservation ? "Création..." : "Réserver maintenant"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
