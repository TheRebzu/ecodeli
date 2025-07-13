"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

const providerOnboardingSchema = z.object({
  businessName: z
    .string()
    .min(2, "Le nom de l'entreprise doit faire au moins 2 caractères"),
  description: z
    .string()
    .min(20, "La description doit faire au moins 20 caractères"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  address: z.string().min(10, "Adresse requise"),
  city: z.string().min(2, "Ville requise"),
  postalCode: z.string().min(5, "Code postal invalide"),
  serviceCategories: z
    .array(z.string())
    .min(1, "Sélectionnez au moins une catégorie de service"),
  hourlyRate: z.number().min(10, "Tarif horaire minimum : 10€"),
  experience: z.string().min(1, "Sélectionnez votre niveau d'expérience"),
  certifications: z.array(z.string()).optional(),
  insurance: z.boolean(),
  acceptTerms: z
    .boolean()
    .refine((val) => val === true, "Vous devez accepter les conditions"),
});

type ProviderOnboardingData = z.infer<typeof providerOnboardingSchema>;

const serviceCategories = [
  { value: "CLEANING", label: "Ménage / Nettoyage" },
  { value: "GARDENING", label: "Jardinage" },
  { value: "HANDYMAN", label: "Bricolage / Réparations" },
  { value: "TUTORING", label: "Cours particuliers" },
  { value: "HEALTHCARE", label: "Soins / Santé" },
  { value: "BEAUTY", label: "Beauté / Esthétique" },
  { value: "PET_SITTING", label: "Garde d'animaux" },
  { value: "OTHER", label: "Autre" },
];

const experienceLevels = [
  { value: "BEGINNER", label: "Débutant (0-2 ans)" },
  { value: "INTERMEDIATE", label: "Intermédiaire (2-5 ans)" },
  { value: "EXPERIENCED", label: "Expérimenté (5-10 ans)" },
  { value: "EXPERT", label: "Expert (10+ ans)" },
];

const availableCertifications = [
  "Certification Qualiopi",
  "Certification AFNOR",
  "Certification professionnelle",
  "Diplôme d'État",
  "Formation continue",
  "Certification sécurité",
  "Certification qualité",
];

export default function ProviderOnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProviderOnboardingData>({
    resolver: zodResolver(providerOnboardingSchema),
    defaultValues: {
      serviceCategories: [],
      certifications: [],
      insurance: false,
      acceptTerms: false,
    },
  });

  const watchedServiceCategories = watch("serviceCategories");
  const watchedCertifications = watch("certifications");
  const watchedInsurance = watch("insurance");
  const watchedAcceptTerms = watch("acceptTerms");

  const toggleServiceCategory = (category: string) => {
    const current = watchedServiceCategories || [];
    if (current.includes(category)) {
      setValue(
        "serviceCategories",
        current.filter((c) => c !== category),
      );
    } else {
      setValue("serviceCategories", [...current, category]);
    }
  };

  const toggleCertification = (certification: string) => {
    const current = watchedCertifications || [];
    if (current.includes(certification)) {
      setValue(
        "certifications",
        current.filter((c) => c !== certification),
      );
    } else {
      setValue("certifications", [...current, certification]);
    }
  };

  const onSubmit = async (data: ProviderOnboardingData) => {
    setIsLoading(true);
    setError(null);
    console.log("SUBMIT", data);
    try {
      const response = await fetch("/api/provider/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Une erreur est survenue");
        return;
      }

      // Rediriger vers le dashboard
      router.push("/provider");
    } catch (err) {
      setError("Une erreur est survenue lors de la sauvegarde");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  function isStepValid(step: number) {
    if (step === 1) {
      const businessName = watch("businessName");
      const description = watch("description");
      const phone = watch("phone");
      const hourlyRate = watch("hourlyRate");

      console.log("STEP 1 VALIDATION:", {
        businessName,
        description,
        descriptionLength: description?.length,
        phone,
        hourlyRate,
        businessNameValid: !!businessName && !errors.businessName,
        descriptionValid:
          !!description && description.length >= 20 && !errors.description,
        phoneValid: !!phone && !errors.phone,
        hourlyRateValid: !!hourlyRate && !errors.hourlyRate,
      });

      return (
        !!businessName &&
        !errors.businessName &&
        !!description &&
        description.length >= 20 &&
        !errors.description &&
        !!phone &&
        !errors.phone &&
        !!hourlyRate &&
        !errors.hourlyRate
      );
    }
    if (step === 2) {
      return (
        !!watch("address") &&
        !errors.address &&
        !!watch("city") &&
        !errors.city &&
        !!watch("postalCode") &&
        !errors.postalCode
      );
    }
    if (step === 3) {
      return (
        watch("serviceCategories")?.length > 0 &&
        !errors.serviceCategories &&
        !!watch("experience") &&
        !errors.experience
      );
    }
    if (step === 4) {
      const insurance = watch("insurance");
      const acceptTerms = watch("acceptTerms");
      const insuranceError = errors.insurance;
      const acceptTermsError = errors.acceptTerms;

      console.log("STEP 4 VALIDATION:", {
        insurance,
        acceptTerms,
        insuranceError,
        acceptTermsError,
        result:
          insurance === true &&
          acceptTerms === true &&
          !insuranceError &&
          !acceptTermsError,
      });

      return (
        insurance === true &&
        acceptTerms === true &&
        !insuranceError &&
        !acceptTermsError
      );
    }
    return false;
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Configuration de votre profil prestataire
        </h1>
        <p className="text-muted-foreground">
          Complétez votre profil pour commencer à proposer vos services sur
          EcoDeli
        </p>
      </div>

      {/* Indicateur de progression */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${
                  currentStep >= step
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }
              `}
              >
                {currentStep > step ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  step
                )}
              </div>
              {step < 4 && (
                <div
                  className={`
                  w-16 h-1 mx-2
                  ${currentStep > step ? "bg-green-600" : "bg-gray-200"}
                `}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Étapes */}
      <form
        onSubmit={handleSubmit((data) => {
          console.log("HANDLE SUBMIT CALLED", data);
          return onSubmit(data);
        })}
        className="space-y-6"
      >
        {/* Étape 1: Informations de base */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations de base
              </CardTitle>
              <CardDescription>
                Vos informations professionnelles principales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Nom de l'entreprise *</Label>
                <Input
                  {...register("businessName")}
                  id="businessName"
                  placeholder="Ex: Services Pro Ménage"
                />
                {errors.businessName && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.businessName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">
                  Description de vos services *
                </Label>
                <Textarea
                  {...register("description")}
                  id="description"
                  placeholder="Décrivez vos services, votre expérience et vos spécialités..."
                  rows={4}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
                    Minimum 20 caractères requis
                  </p>
                  <p
                    className={`text-xs ${watch("description")?.length >= 20 ? "text-green-600" : "text-red-600"}`}
                  >
                    {watch("description")?.length || 0}/20 caractères
                  </p>
                </div>
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    {...register("phone")}
                    id="phone"
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="hourlyRate">Tarif horaire (€) *</Label>
                  <Input
                    {...register("hourlyRate", { valueAsNumber: true })}
                    id="hourlyRate"
                    type="number"
                    min="10"
                    placeholder="25"
                  />
                  {errors.hourlyRate && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.hourlyRate.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Localisation */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localisation
              </CardTitle>
              <CardDescription>Votre zone d'intervention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Adresse *</Label>
                <Input
                  {...register("address")}
                  id="address"
                  placeholder="123 Rue de la Paix"
                />
                {errors.address && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ville *</Label>
                  <Input {...register("city")} id="city" placeholder="Paris" />
                  {errors.city && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="postalCode">Code postal *</Label>
                  <Input
                    {...register("postalCode")}
                    id="postalCode"
                    placeholder="75001"
                  />
                  {errors.postalCode && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.postalCode.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 3: Services et expérience */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Services et expérience
              </CardTitle>
              <CardDescription>
                Définissez vos services et votre niveau d'expérience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Catégories de services *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {serviceCategories.map((category) => (
                    <div
                      key={category.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={category.value}
                        checked={watchedServiceCategories?.includes(
                          category.value,
                        )}
                        onCheckedChange={() =>
                          toggleServiceCategory(category.value)
                        }
                      />
                      <Label htmlFor={category.value} className="text-sm">
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.serviceCategories && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.serviceCategories.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="experience">Niveau d'expérience *</Label>
                <Select
                  onValueChange={(value) => setValue("experience", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez votre niveau d'expérience" />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.experience && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.experience.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Certifications (optionnel)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {availableCertifications.map((certification) => (
                    <div
                      key={certification}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={certification}
                        checked={watchedCertifications?.includes(certification)}
                        onCheckedChange={() =>
                          toggleCertification(certification)
                        }
                      />
                      <Label htmlFor={certification} className="text-sm">
                        {certification}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 4: Validation et conditions */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Validation et conditions
              </CardTitle>
              <CardDescription>
                Confirmez vos informations et acceptez les conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Votre profil sera soumis à validation par notre équipe. Vous
                  recevrez une notification une fois validé.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="insurance"
                    checked={watchedInsurance}
                    onCheckedChange={(checked) => {
                      setValue("insurance", checked as boolean, {
                        shouldValidate: true,
                      });
                    }}
                  />
                  <Label htmlFor="insurance" className="text-sm">
                    Je confirme avoir une assurance professionnelle en cours de
                    validité
                  </Label>
                </div>
                {errors.insurance && (
                  <p className="text-sm text-red-600">
                    {errors.insurance.message}
                  </p>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={watchedAcceptTerms}
                    onCheckedChange={(checked) => {
                      setValue("acceptTerms", checked as boolean, {
                        shouldValidate: true,
                      });
                    }}
                  />
                  <Label htmlFor="acceptTerms" className="text-sm">
                    J'accepte les{" "}
                    <a
                      href="/terms"
                      className="text-green-600 hover:text-green-500 underline"
                    >
                      conditions d'utilisation
                    </a>{" "}
                    et la{" "}
                    <a
                      href="/privacy"
                      className="text-green-600 hover:text-green-500 underline"
                    >
                      politique de confidentialité
                    </a>
                  </Label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-sm text-red-600">
                    {errors.acceptTerms.message}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation entre étapes */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Précédent
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
            >
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isLoading || !isStepValid(currentStep)}
              onClick={() => {
                console.log("CLICK SUBMIT BUTTON");
                console.log("BUTTON STATE:", {
                  isLoading,
                  currentStep,
                  isStepValid: isStepValid(currentStep),
                  disabled: isLoading || !isStepValid(currentStep),
                });
                console.log("FORM STATE:", {
                  isValid,
                  errors,
                });
                console.log(
                  "DETAILED ERRORS:",
                  JSON.stringify(errors, null, 2),
                );
                console.log("ALL FORM VALUES:", {
                  businessName: watch("businessName"),
                  description: watch("description"),
                  phone: watch("phone"),
                  hourlyRate: watch("hourlyRate"),
                  address: watch("address"),
                  city: watch("city"),
                  postalCode: watch("postalCode"),
                  serviceCategories: watch("serviceCategories"),
                  experience: watch("experience"),
                  insurance: watch("insurance"),
                  acceptTerms: watch("acceptTerms"),
                });
              }}
            >
              {isLoading ? "Sauvegarde..." : "Terminer la configuration"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
