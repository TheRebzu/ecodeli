"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";
// Define UserRole locally to avoid Prisma client import on client side
type UserRole = "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" | "ADMIN";

const validationSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z
    .string()
    .min(10, "Le numéro de téléphone doit contenir au moins 10 chiffres"),
  address: z.string().min(10, "L'adresse doit contenir au moins 10 caractères"),
  city: z.string().min(2, "La ville doit contenir au moins 2 caractères"),
  postalCode: z
    .string()
    .min(4, "Le code postal doit contenir au moins 4 caractères"),
  country: z.string().min(2, "Le pays doit contenir au moins 2 caractères"),
  additionalInfo: z.string().optional(),
});

type ValidationFormData = z.infer<typeof validationSchema>;

interface UserValidationFormProps {
  userRole: UserRole;
  userId: string;
  onValidationComplete?: () => void;
}

export function UserValidationForm({
  userRole,
  userId,
  onValidationComplete,
}: UserValidationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const form = useForm<ValidationFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "France",
      additionalInfo: "",
    },
  });

  const onSubmit = async (data: ValidationFormData) => {
    setIsLoading(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/auth/validate-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userRole,
          profileData: data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus("success");
        setMessage("Votre profil a été validé avec succès !");
        onValidationComplete?.();
      } else {
        setStatus("error");
        setMessage(result.error || "Erreur lors de la validation du profil");
      }
    } catch (error) {
      console.error("Erreur de validation:", error);
      setStatus("error");
      setMessage("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleSpecificDescription = () => {
    switch (userRole) {
      case "DELIVERER":
        return "Complétez votre profil pour devenir livreur EcoDeli. Vous devrez également fournir des documents d'identité, permis de conduire et assurance.";
      case "MERCHANT":
        return "Complétez votre profil pour accéder à l'espace commerçant et gérer vos contrats EcoDeli.";
      case "PROVIDER":
        return "Complétez votre profil pour proposer vos services à la personne sur EcoDeli.";
      case "CLIENT":
        return "Complétez votre profil pour accéder à tous les services EcoDeli.";
      default:
        return "Complétez votre profil pour finaliser votre inscription.";
    }
  };

  const getRequiredDocuments = () => {
    switch (userRole) {
      case "DELIVERER":
        return [
          "Pièce d'identité",
          "Permis de conduire",
          "Attestation d'assurance",
        ];
      case "MERCHANT":
        return ["Justificatif d'entreprise", "Contrat commercial"];
      case "PROVIDER":
        return ["Certifications professionnelles", "Attestations de formation"];
      default:
        return [];
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Validation du profil
        </CardTitle>
        <CardDescription>{getRoleSpecificDescription()}</CardDescription>
      </CardHeader>

      <CardContent>
        {status === "success" && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {status === "error" && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {message}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Votre prénom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input placeholder="Votre nom" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de téléphone *</FormLabel>
                  <FormControl>
                    <Input placeholder="06 12 34 56 78" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse *</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Rue de la Paix" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville *</FormLabel>
                    <FormControl>
                      <Input placeholder="Paris" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal *</FormLabel>
                    <FormControl>
                      <Input placeholder="75001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un pays" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Belgique">Belgique</SelectItem>
                        <SelectItem value="Suisse">Suisse</SelectItem>
                        <SelectItem value="Luxembourg">Luxembourg</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informations complémentaires</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informations supplémentaires utiles pour votre profil..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Décrivez vos expériences, compétences ou motivations pour
                    rejoindre EcoDeli.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {getRequiredDocuments().length > 0 && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-900 mb-2">
                  Documents requis
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {getRequiredDocuments().map((doc, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {doc}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  Ces documents devront être fournis après la validation de
                  votre profil.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Validation en cours..." : "Valider mon profil"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
