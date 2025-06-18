"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "@/navigation";
import { toast } from "sonner";
import { useRoleProtection } from "@/hooks/auth/use-role-protection";
import { RouteAnnouncementForm } from "@/components/shared/announcements/route-announcement-form";
import { api } from "@/trpc/react";

// Type pour les données du formulaire de route
type RouteAnnouncementFormData = {
  title: string;
  description?: string;
  departureAddress: string;
  departureLatitude?: number;
  departureLongitude?: number;
  arrivalAddress: string;
  arrivalLatitude?: number;
  arrivalLongitude?: number;
  intermediatePoints: Array<{
    address: string;
    latitude?: number;
    longitude?: number;
    radius: number;
  }>;
  departureDate?: string;
  departureTimeWindow?: string;
  arrivalDate?: string;
  arrivalTimeWindow?: string;
  isRecurring: boolean;
  recurringDays: number[];
  recurringEndDate?: string;
  maxWeight: number;
  maxVolume?: number;
  availableSeats: number;
  acceptsFragile: boolean;
  acceptsCooling: boolean;
  acceptsLiveAnimals: boolean;
  acceptsOversized: boolean;
  enableNotifications: boolean;
  autoMatch: boolean;
  minMatchDistance: number;
  maxDetour: number;
  pricePerKm: number;
  fixedPrice?: number;
  isNegotiable: boolean;
  preferredClientTypes: string[];
  specialInstructions?: string;
};

export default function CreateRoutePage() {
  useRoleProtection(["DELIVERER"]);
  const t = useTranslations("routes");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Mutation pour créer une route
  const createRouteMutation = api.delivererRoute.createRoute.useMutation({
    onSuccess: (result) => {
      toast.success("Itinéraire créé avec succès", {
        description: "Votre annonce d'itinéraire a été publiée"
      });
      router.push("/deliverer/my-routes");
    },
    onError: (error) => {
      setError(error.message || "Erreur lors de la création de l'itinéraire");
      toast.error("Erreur lors de la création", {
        description: error.message || "Une erreur s'est produite"
      });
    }
  });

  // Gérer la soumission du formulaire
  const handleSubmit = async (data: RouteAnnouncementFormData) => {
    setError(null);
    createRouteMutation.mutate(data);
  };


  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("announceRoute")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("announceRouteDescription")}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/deliverer/my-routes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back")}
          </Link>
        </Button>
      </div>

      <Separator className="my-6" />

      <div className="max-w-6xl mx-auto">
        <RouteAnnouncementForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={createRouteMutation.isPending}
          error={error}
          mode="create"
        />
      </div>
    </div>
  );
}
