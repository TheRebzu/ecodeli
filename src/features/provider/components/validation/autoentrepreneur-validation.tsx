"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  Building,
  Shield,
  FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useApi } from "@/hooks/use-api";
import {
  providerAutoentrepreneurSchema,
  type ProviderAutoentrepreneurData,
} from "@/features/provider/schemas/provider-validation.schema";
import { toast } from "sonner";

interface AutoentrepreneurValidationProps {
  providerId: string;
}

export function AutoentrepreneurValidation({
  providerId,
}: AutoentrepreneurValidationProps) {
  const { user } = useAuth();
  const { execute } = useApi();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProviderAutoentrepreneurData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProviderAutoentrepreneurData>({
    resolver: zodResolver(providerAutoentrepreneurSchema),
    defaultValues: {
      legalStatus: "AUTOENTREPRENEUR",
      vatNumber: "",
      insuranceProvider: "",
      insurancePolicy: "",
      insuranceExpiry: "",
      insuranceDocument: "",
    },
  });

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      const response = await execute(
        `/api/provider/validation/autoentrepreneur`,
      );
      if (response) {
        setData(response);
        // Populate form with existing data
        Object.entries(response).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            setValue(key as keyof ProviderAutoentrepreneurData, value);
          }
        });
      }
    } catch (error) {
      console.error("Error fetching autoentrepreneur data:", error);
    }
  };

  const onSubmit = async (formData: ProviderAutoentrepreneurData) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await execute(
        "/api/provider/validation/autoentrepreneur",
        {
          method: "POST",
          body: JSON.stringify(formData),
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response) {
        setData(response);
        toast.success("Statut autoentrepreneur mis à jour avec succès");
      }
    } catch (error) {
      console.error("Error updating autoentrepreneur data:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const getStatusBadge = () => {
    if (!data) return null;

    const hasInsurance =
      data.insuranceProvider && data.insurancePolicy && data.insuranceDocument;
    const isExpired =
      data.insuranceExpiry && new Date(data.insuranceExpiry) < new Date();

    if (!hasInsurance) {
      return <Badge variant="destructive">Assurance manquante</Badge>;
    }

    if (isExpired) {
      return <Badge variant="destructive">Assurance expirée</Badge>;
    }

    return <Badge variant="default">Complète</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building className="w-5 h-5" />
          Statut Autoentrepreneur
        </h3>
        <p className="text-gray-600">
          Configuration obligatoire de votre statut juridique et assurance
          professionnelle
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Statut juridique
          </CardTitle>
          <CardDescription>
            Définissez votre statut juridique et vos informations d'assurance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Statut juridique */}
            <div className="space-y-2">
              <Label htmlFor="legalStatus">Statut juridique *</Label>
              <Select
                defaultValue="AUTOENTREPRENEUR"
                onValueChange={(value) => setValue("legalStatus", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez votre statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTOENTREPRENEUR">
                    Auto-entrepreneur
                  </SelectItem>
                  <SelectItem value="SASU">SASU</SelectItem>
                  <SelectItem value="EURL">EURL</SelectItem>
                  <SelectItem value="SAS">SAS</SelectItem>
                  <SelectItem value="EI">Entreprise Individuelle</SelectItem>
                </SelectContent>
              </Select>
              {errors.legalStatus && (
                <p className="text-sm text-red-600">
                  {errors.legalStatus.message}
                </p>
              )}
            </div>

            {/* Numéro de TVA */}
            <div className="space-y-2">
              <Label htmlFor="vatNumber">Numéro de TVA (optionnel)</Label>
              <Input
                id="vatNumber"
                placeholder="FR12345678901"
                {...register("vatNumber")}
              />
              {errors.vatNumber && (
                <p className="text-sm text-red-600">
                  {errors.vatNumber.message}
                </p>
              )}
            </div>

            {/* Assurance professionnelle */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium">Assurance professionnelle</h4>
                {getStatusBadge()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Assureur *</Label>
                  <Input
                    id="insuranceProvider"
                    placeholder="Nom de votre assureur"
                    {...register("insuranceProvider")}
                  />
                  {errors.insuranceProvider && (
                    <p className="text-sm text-red-600">
                      {errors.insuranceProvider.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurancePolicy">Numéro de police *</Label>
                  <Input
                    id="insurancePolicy"
                    placeholder="Numéro de votre police d'assurance"
                    {...register("insurancePolicy")}
                  />
                  {errors.insurancePolicy && (
                    <p className="text-sm text-red-600">
                      {errors.insurancePolicy.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceExpiry">Date d'expiration *</Label>
                  <Input
                    id="insuranceExpiry"
                    type="date"
                    {...register("insuranceExpiry")}
                  />
                  {errors.insuranceExpiry && (
                    <p className="text-sm text-red-600">
                      {errors.insuranceExpiry.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insuranceDocument">
                    Document d'assurance *
                  </Label>
                  <Input
                    id="insuranceDocument"
                    placeholder="URL du document d'assurance"
                    {...register("insuranceDocument")}
                  />
                  {errors.insuranceDocument && (
                    <p className="text-sm text-red-600">
                      {errors.insuranceDocument.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                L'assurance professionnelle est obligatoire pour tous les
                prestataires EcoDeli. Elle doit couvrir votre activité et être
                valide à tout moment.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading || !isValid}>
                {loading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
