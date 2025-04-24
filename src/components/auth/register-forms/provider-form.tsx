"use client";

import React, { useState, useEffect } from "react";
import { PersonalInfo, PersonalInfoData } from "@/components/auth/form-steps/personal-info";
import { AccountDetails, AccountDetailsData } from "@/components/auth/form-steps/account-details";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for service provider information
const providerInfoSchema = z.object({
  serviceType: z.string().min(1, {
    message: "Veuillez sélectionner un type de service",
  }),
  experience: z.string().min(1, {
    message: "Veuillez sélectionner votre niveau d&apos;expérience",
  }),
  certifications: z.string().optional(),
  description: z.string().min(10, {
    message: "La description doit contenir au moins 10 caractères",
  }).max(500, {
    message: "La description ne doit pas dépasser 500 caractères",
  }),
  hourlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, {
    message: "Veuillez saisir un tarif horaire valide",
  }),
  address: z.string().min(5, {
    message: "L&apos;adresse doit contenir au moins 5 caractères",
  }),
  city: z.string().min(2, {
    message: "La ville doit contenir au moins 2 caractères",
  }),
  postalCode: z.string().regex(/^\d{5}$/, {
    message: "Le code postal doit contenir 5 chiffres",
  }),
  serviceArea: z.number().min(1, {
    message: "Veuillez spécifier votre zone de service en km",
  }),
});

type ProviderInfoData = z.infer<typeof providerInfoSchema>;

type RegistrationStep = "personal-info" | "provider-info" | "account-details" | "confirmation";

interface FormData {
  personalInfo?: PersonalInfoData;
  providerInfo?: ProviderInfoData;
  accountDetails?: AccountDetailsData;
}

export function ProviderRegistrationForm() {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("personal-info");
  const [formData, setFormData] = useState<FormData>({});
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handlePersonalInfoSubmit = (data: PersonalInfoData) => {
    setFormData((prev) => ({ ...prev, personalInfo: data }));
    setCurrentStep("provider-info");
  };

  const handleProviderInfoSubmit = (data: ProviderInfoData) => {
    setFormData((prev) => ({ ...prev, providerInfo: data }));
    setCurrentStep("account-details");
  };

  const handleAccountDetailsSubmit = async (data: AccountDetailsData) => {
    setFormData((prev) => ({ ...prev, accountDetails: data }));
    
    // Submit the complete form data to the server
    try {
      // Combine data
      const completeData = {
        ...formData.personalInfo,
        ...formData.providerInfo,
        password: data.password,
        role: "PROVIDER",
      };
      
      // API call would go here
      console.log("Submitting provider registration:", completeData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success state
      setCurrentStep("confirmation");
      setRegistrationComplete(true);
    } catch (error) {
      console.error("Registration error:", error);
      // Would handle error state here
    }
  };

  const handleBackToPersonalInfo = () => {
    setCurrentStep("personal-info");
  };

  const handleBackToProviderInfo = () => {
    setCurrentStep("provider-info");
  };

  // Provider Info Form Component
  const ProviderInfoForm = ({ onSubmit, onBack, defaultValues }: { 
    onSubmit: (data: ProviderInfoData) => void, 
    onBack: () => void, 
    defaultValues?: Partial<ProviderInfoData> 
  }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serviceAreaValue, setServiceAreaValue] = useState(defaultValues?.serviceArea || 5);

    const {
      register,
      handleSubmit,
      setValue,
      formState: { errors },
    } = useForm<ProviderInfoData>({
      resolver: zodResolver(providerInfoSchema),
      defaultValues: {
        serviceType: "",
        experience: "",
        certifications: "",
        description: "",
        hourlyRate: "",
        address: "",
        city: "",
        postalCode: "",
        serviceArea: 5,
        ...defaultValues,
      },
    });

    // Update service area when slider changes
    useEffect(() => {
      setValue("serviceArea", serviceAreaValue);
    }, [serviceAreaValue, setValue]);

    const handleFormSubmit = async (data: ProviderInfoData) => {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-6 w-full max-w-md mx-auto"
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">Informations prestataire</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Détails sur vos services et votre expertise
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="serviceType"
              className="text-sm font-medium leading-none"
            >
              Type de service <span className="text-destructive">*</span>
            </label>
            <select
              id="serviceType"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.serviceType ? "border-destructive" : "border-input"
              }`}
              {...register("serviceType")}
            >
              <option value="">Sélectionnez un type</option>
              <option value="cleaning">Ménage / Nettoyage</option>
              <option value="gardening">Jardinage</option>
              <option value="babysitting">Garde d&apos;enfants</option>
              <option value="tutoring">Soutien scolaire</option>
              <option value="pet-care">Garde d&apos;animaux</option>
              <option value="handyman">Bricolage</option>
              <option value="cooking">Cuisine à domicile</option>
              <option value="senior-care">Aide aux personnes âgées</option>
              <option value="other">Autre</option>
            </select>
            {errors.serviceType && (
              <p className="text-sm text-destructive">{errors.serviceType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="experience"
              className="text-sm font-medium leading-none"
            >
              Expérience <span className="text-destructive">*</span>
            </label>
            <select
              id="experience"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.experience ? "border-destructive" : "border-input"
              }`}
              {...register("experience")}
            >
              <option value="">Sélectionnez votre niveau</option>
              <option value="beginner">Débutant (moins d&apos;1 an)</option>
              <option value="intermediate">Intermédiaire (1-3 ans)</option>
              <option value="advanced">Avancé (3-5 ans)</option>
              <option value="expert">Expert (5+ ans)</option>
            </select>
            {errors.experience && (
              <p className="text-sm text-destructive">{errors.experience.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="certifications"
              className="text-sm font-medium leading-none"
            >
              Certifications / Diplômes
            </label>
            <input
              id="certifications"
              type="text"
              placeholder="Ex: CAP, BEP, diplôme universitaire..."
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.certifications ? "border-destructive" : "border-input"
              }`}
              {...register("certifications")}
            />
            {errors.certifications && (
              <p className="text-sm text-destructive">{errors.certifications.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-sm font-medium leading-none"
            >
              Description de vos services <span className="text-destructive">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Décrivez vos services, votre expérience et ce que vous proposez..."
              className={`flex w-full rounded-md border px-3 py-2 text-sm ${
                errors.description ? "border-destructive" : "border-input"
              }`}
              {...register("description")}
            ></textarea>
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="hourlyRate"
              className="text-sm font-medium leading-none"
            >
              Tarif horaire (€) <span className="text-destructive">*</span>
            </label>
            <input
              id="hourlyRate"
              type="text"
              placeholder="Ex: 25.50"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.hourlyRate ? "border-destructive" : "border-input"
              }`}
              {...register("hourlyRate")}
            />
            {errors.hourlyRate && (
              <p className="text-sm text-destructive">{errors.hourlyRate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="address"
              className="text-sm font-medium leading-none"
            >
              Adresse <span className="text-destructive">*</span>
            </label>
            <input
              id="address"
              type="text"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.address ? "border-destructive" : "border-input"
              }`}
              {...register("address")}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="city"
                className="text-sm font-medium leading-none"
              >
                Ville <span className="text-destructive">*</span>
              </label>
              <input
                id="city"
                type="text"
                className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                  errors.city ? "border-destructive" : "border-input"
                }`}
                {...register("city")}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="postalCode"
                className="text-sm font-medium leading-none"
              >
                Code postal <span className="text-destructive">*</span>
              </label>
              <input
                id="postalCode"
                type="text"
                className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                  errors.postalCode ? "border-destructive" : "border-input"
                }`}
                {...register("postalCode")}
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive">{errors.postalCode.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="serviceArea"
              className="text-sm font-medium leading-none"
            >
              Zone de service (km) <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                id="serviceArea"
                type="range"
                min="1" 
                max="50"
                value={serviceAreaValue}
                onChange={(e) => setServiceAreaValue(parseInt(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-medium">{serviceAreaValue} km</span>
            </div>
            {errors.serviceArea && (
              <p className="text-sm text-destructive">{errors.serviceArea.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-input rounded-md text-sm font-medium"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Chargement..." : "Continuer"}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-center">Inscription Prestataire</h1>
        <p className="text-center text-muted-foreground">
          Rejoignez EcoDeli en tant que prestataire de services et développez votre clientèle
        </p>
      </div>

      {/* Progress tracker */}
      <div className="w-full max-w-md mx-auto mb-10">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2" />
          
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
              currentStep === "personal-info" 
                ? "bg-primary text-primary-foreground" 
                : "bg-primary text-primary-foreground"
            }`}>
              1
            </div>
            <span className="text-xs mt-1">Informations</span>
          </div>
          
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
              currentStep === "provider-info" || currentStep === "account-details" || currentStep === "confirmation"
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              2
            </div>
            <span className="text-xs mt-1">Services</span>
          </div>
          
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
              currentStep === "account-details" || currentStep === "confirmation"
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              3
            </div>
            <span className="text-xs mt-1">Compte</span>
          </div>
          
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
              currentStep === "confirmation" && registrationComplete
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            }`}>
              4
            </div>
            <span className="text-xs mt-1">Confirmation</span>
          </div>
        </div>
      </div>

      {/* Form steps */}
      <div className="mt-8">
        {currentStep === "personal-info" && (
          <PersonalInfo 
            onSubmit={handlePersonalInfoSubmit} 
            defaultValues={formData.personalInfo}
          />
        )}
        
        {currentStep === "provider-info" && (
          <ProviderInfoForm 
            onSubmit={handleProviderInfoSubmit} 
            onBack={handleBackToPersonalInfo}
            defaultValues={formData.providerInfo}
          />
        )}
        
        {currentStep === "account-details" && (
          <AccountDetails 
            onSubmit={handleAccountDetailsSubmit} 
            onBack={handleBackToProviderInfo}
          />
        )}
        
        {currentStep === "confirmation" && registrationComplete && (
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-green-600"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Inscription réussie!</h2>
            <p className="text-muted-foreground">
              Votre compte prestataire a été créé avec succès. Un email de confirmation a été envoyé à 
              <span className="font-medium text-foreground"> {formData.personalInfo?.email}</span>.
            </p>
            <div className="pt-4">
              <a 
                href="/login" 
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md inline-block"
              >
                Se connecter
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProviderRegistrationForm; 