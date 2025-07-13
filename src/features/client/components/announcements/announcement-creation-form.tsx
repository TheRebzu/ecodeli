"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Package, Clock, Euro } from "lucide-react";

interface AnnouncementFormData {
  title: string;
  description: string;
  type: string;
  pickupAddress: string;
  deliveryAddress: string;
  price: number;
  desiredDate: string;
  urgent: boolean;
}

export function AnnouncementCreationForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: "",
    description: "",
    type: "",
    pickupAddress: "",
    deliveryAddress: "",
    price: 0,
    desiredDate: "",
    urgent: false,
  });
  const router = useRouter();

  const announcementTypes = [
    { value: "PACKAGE_DELIVERY", label: "Livraison de colis", icon: Package },
    {
      value: "DOCUMENT_DELIVERY",
      label: "Livraison de documents",
      icon: Package,
    },
    {
      value: "SHOPPING_DELIVERY",
      label: "Livraison de courses",
      icon: Package,
    },
    { value: "URGENT_DELIVERY", label: "Livraison express", icon: Clock },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/client/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          startLocation: {
            address: formData.pickupAddress,
            city: formData.pickupAddress.split(",").pop()?.trim() || "Paris",
          },
          endLocation: {
            address: formData.deliveryAddress,
            city: formData.deliveryAddress.split(",").pop()?.trim() || "Lyon",
          },
          price: formData.price,
          currency: "EUR",
          desiredDate: formData.desiredDate,
          urgent: formData.urgent,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/client/announcements/${result.announcement.id}`);
      } else {
        const error = await response.json();
        console.error("Erreur création:", error);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(Math.min(step + 1, 4));
  const prevStep = () => setStep(Math.max(step - 1, 1));

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Créer une annonce</h1>
        <p className="text-muted-foreground">
          Trouvez un livreur pour votre colis en quelques étapes
        </p>

        {/* Progress bar */}
        <div className="flex items-center mt-6 mb-8">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= num
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {num}
              </div>
              {num < 4 && (
                <div
                  className={`w-12 h-1 mx-2 ${step > num ? "bg-primary" : "bg-muted"}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Type de livraison"}
            {step === 2 && "Détails de la demande"}
            {step === 3 && "Adresses"}
            {step === 4 && "Prix et planning"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Sélectionnez le type de service souhaité"}
            {step === 2 && "Décrivez votre demande en détail"}
            {step === 3 && "Indiquez les lieux de récupération et livraison"}
            {step === 4 && "Définissez le prix et la date souhaitée"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Étape 1: Type */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcementTypes.map((type) => (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    formData.type === type.value ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, type: type.value }))
                  }
                >
                  <CardContent className="p-4 text-center">
                    <type.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium">{type.label}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Étape 2: Détails */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Titre de l'annonce
                </label>
                <Input
                  placeholder="Ex: Livraison colis urgent Paris-Lyon"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Description détaillée
                </label>
                <Textarea
                  placeholder="Décrivez votre demande: type de colis, dimensions, précautions particulières..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="min-h-32"
                />
              </div>
            </div>
          )}

          {/* Étape 3: Adresses */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Adresse de récupération
                </label>
                <Input
                  placeholder="Ex: 15 Rue de Rivoli, 75001 Paris"
                  value={formData.pickupAddress}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pickupAddress: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Adresse de livraison
                </label>
                <Input
                  placeholder="Ex: 25 Rue de la République, 69002 Lyon"
                  value={formData.deliveryAddress}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deliveryAddress: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}

          {/* Étape 4: Prix et planning */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Prix proposé (€)
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 45.50"
                  value={formData.price || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date souhaitée
                </label>
                <Input
                  type="datetime-local"
                  value={formData.desiredDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      desiredDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={formData.urgent}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      urgent: e.target.checked,
                    }))
                  }
                />
                <label htmlFor="urgent" className="text-sm font-medium">
                  Livraison urgente (+5€)
                </label>
                {formData.urgent && (
                  <Badge variant="destructive">Express</Badge>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={prevStep} disabled={step === 1}>
              Précédent
            </Button>

            {step < 4 ? (
              <Button
                onClick={nextStep}
                disabled={
                  (step === 1 && !formData.type) ||
                  (step === 2 && (!formData.title || !formData.description)) ||
                  (step === 3 &&
                    (!formData.pickupAddress || !formData.deliveryAddress))
                }
              >
                Suivant
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !formData.price || !formData.desiredDate}
              >
                {loading ? "Création..." : "Créer l'annonce"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
