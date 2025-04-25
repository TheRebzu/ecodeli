"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Schéma de validation commun pour tous les types d'inscription
const baseSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "Le prénom doit contenir au moins 2 caractères"),
    lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Veuillez saisir une adresse email valide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(
        /[A-Z]/,
        "Le mot de passe doit contenir au moins une lettre majuscule",
      )
      .regex(
        /[a-z]/,
        "Le mot de passe doit contenir au moins une lettre minuscule",
      )
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
    confirmPassword: z.string(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

// Extract the base schema type to reuse
type BaseSchemaType = z.infer<typeof baseSchema>;

// Schéma pour l'inscription des clients
const clientSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /[A-Z]/,
      "Le mot de passe doit contenir au moins une lettre majuscule",
    )
    .regex(
      /[a-z]/,
      "Le mot de passe doit contenir au moins une lettre minuscule",
    )
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  role: z.literal("CLIENT"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Schéma pour l'inscription des livreurs
const delivererSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /[A-Z]/,
      "Le mot de passe doit contenir au moins une lettre majuscule",
    )
    .regex(
      /[a-z]/,
      "Le mot de passe doit contenir au moins une lettre minuscule",
    )
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  role: z.literal("DELIVERER"),
  vehicleType: z.string().min(1, "Le type de véhicule est requis"),
  licenseNumber: z.string().optional(),
  idCardNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Schéma pour l'inscription des commerçants
const merchantSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /[A-Z]/,
      "Le mot de passe doit contenir au moins une lettre majuscule",
    )
    .regex(
      /[a-z]/,
      "Le mot de passe doit contenir au moins une lettre minuscule",
    )
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  role: z.literal("MERCHANT"),
  storeName: z
    .string()
    .min(2, "Le nom du commerce doit contenir au moins 2 caractères"),
  storeType: z.string().min(1, "Le type de commerce est requis"),
  siret: z
    .string()
    .min(14, "Le numéro SIRET doit contenir 14 caractères")
    .max(14),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Schéma pour l'inscription des prestataires
const providerSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez saisir une adresse email valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /[A-Z]/,
      "Le mot de passe doit contenir au moins une lettre majuscule",
    )
    .regex(
      /[a-z]/,
      "Le mot de passe doit contenir au moins une lettre minuscule",
    )
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  role: z.literal("PROVIDER"),
  serviceType: z.string().min(1, "Le type de service est requis"),
  experience: z.string().optional(),
  hourlyRate: z.string().optional(),
  serviceArea: z.number().optional(),
  description: z.string().optional(),
  siret: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ClientFormValues = z.infer<typeof clientSchema>;
type DelivererFormValues = z.infer<typeof delivererSchema>;
type MerchantFormValues = z.infer<typeof merchantSchema>;
type ProviderFormValues = z.infer<typeof providerSchema>;

type FormValues =
  | ClientFormValues
  | DelivererFormValues
  | MerchantFormValues
  | ProviderFormValues;

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("client");

  // Mutation tRPC pour l'inscription
  const registerMutation = api.auth.register.useMutation({
    onSuccess: (data) => {
      // Redirection vers la page de confirmation
      router.push(`/verify-email?email=${encodeURIComponent(data.user.email)}`);
    },
    onError: (error) => {
      setError(error.message);
      setIsLoading(false);
    },
  });

  // Formulaire pour les clients
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: "CLIENT",
    },
  });

  // Formulaire pour les livreurs
  const delivererForm = useForm<DelivererFormValues>({
    resolver: zodResolver(delivererSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: "DELIVERER",
      vehicleType: "",
      licenseNumber: "",
      idCardNumber: "",
    },
  });

  // Formulaire pour les commerçants
  const merchantForm = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: "MERCHANT",
      storeName: "",
      storeType: "",
      siret: "",
    },
  });

  // Formulaire pour les prestataires
  const providerForm = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: "PROVIDER",
      serviceType: "",
      experience: "",
      hourlyRate: "",
    },
  });

  // Fonction pour gérer la soumission du formulaire
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Suppression du champ confirmPassword avant l'envoi
      const { confirmPassword, ...formData } = data;

      // Utilisation de la mutation tRPC pour l'inscription
      registerMutation.mutate(formData);
    } catch (error) {
      console.error("Registration error:", error);
      setError(t("register.errors.unexpected"));
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          {t("register.title")}
        </CardTitle>
        <CardDescription className="text-center">
          {t("register.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="client">
              {t("register.roles.client")}
            </TabsTrigger>
            <TabsTrigger value="deliverer">
              {t("register.roles.deliverer")}
            </TabsTrigger>
            <TabsTrigger value="merchant">
              {t("register.roles.merchant")}
            </TabsTrigger>
            <TabsTrigger value="provider">
              {t("register.roles.provider")}
            </TabsTrigger>
          </TabsList>

          {/* Formulaire Client */}
          <TabsContent value="client">
            <form
              onSubmit={clientForm.handleSubmit((data) => onSubmit(data))}
              className="space-y-4"
            >
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-firstName">
                    {t("register.form.firstName")}
                  </Label>
                  <Input
                    id="client-firstName"
                    placeholder={t("register.form.firstNamePlaceholder")}
                    disabled={isLoading}
                    {...clientForm.register("firstName")}
                  />
                  {clientForm.formState.errors.firstName && (
                    <p className="text-sm text-red-500">
                      {clientForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-lastName">
                    {t("register.form.lastName")}
                  </Label>
                  <Input
                    id="client-lastName"
                    placeholder={t("register.form.lastNamePlaceholder")}
                    disabled={isLoading}
                    {...clientForm.register("lastName")}
                  />
                  {clientForm.formState.errors.lastName && (
                    <p className="text-sm text-red-500">
                      {clientForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-email">{t("register.form.email")}</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder={t("register.form.emailPlaceholder")}
                  autoComplete="email"
                  disabled={isLoading}
                  {...clientForm.register("email")}
                />
                {clientForm.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {clientForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-password">
                    {t("register.form.password")}
                  </Label>
                  <Input
                    id="client-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...clientForm.register("password")}
                  />
                  {clientForm.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {clientForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-confirmPassword">
                    {t("register.form.confirmPassword")}
                  </Label>
                  <Input
                    id="client-confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...clientForm.register("confirmPassword")}
                  />
                  {clientForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {clientForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-phone">{t("register.form.phone")}</Label>
                <Input
                  id="client-phone"
                  type="tel"
                  placeholder={t("register.form.phonePlaceholder")}
                  disabled={isLoading}
                  {...clientForm.register("phone")}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || registerMutation.isPending}
              >
                {isLoading || registerMutation.isPending
                  ? t("register.form.submitting")
                  : t("register.form.submitClient")}
              </Button>
            </form>
          </TabsContent>

          {/* Formulaires pour les autres rôles similaires... */}
          {/* Formulaire Livreur */}
          <TabsContent value="deliverer">
            {/* Contenu similaire adapté pour les livreurs */}
          </TabsContent>

          {/* Formulaire Commerçant */}
          <TabsContent value="merchant">
            {/* Contenu similaire adapté pour les commerçants */}
          </TabsContent>

          {/* Formulaire Prestataire */}
          <TabsContent value="provider">
            {/* Contenu similaire adapté pour les prestataires */}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-center text-muted-foreground">
          {t("register.alreadyHaveAccount")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("register.login")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
