"use client";

import { useState } from "react";
import {
  PersonalInfo,
  PersonalInfoData,
} from "@/components/auth/form-steps/personal-info";
import {
  AccountDetails,
  AccountDetailsData,
} from "@/components/auth/form-steps/account-details";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for store information
const storeInfoSchema = z.object({
  storeName: z.string().min(2, {
    message: "Le nom du commerce doit contenir au moins 2 caractères",
  }),
  storeType: z.string().min(1, {
    message: "Veuillez sélectionner un type de commerce",
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
  siret: z.string().regex(/^\d{14}$/, {
    message: "Le numéro SIRET doit contenir 14 chiffres",
  }),
});

type StoreInfoData = z.infer<typeof storeInfoSchema>;

type RegistrationStep =
  | "personal-info"
  | "store-info"
  | "account-details"
  | "confirmation";

interface FormData {
  personalInfo?: PersonalInfoData;
  storeInfo?: StoreInfoData;
  accountDetails?: AccountDetailsData;
}

export function MerchantRegistrationForm() {
  const [currentStep, setCurrentStep] =
    useState<RegistrationStep>("personal-info");
  const [formData, setFormData] = useState<FormData>({});
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handlePersonalInfoSubmit = (data: PersonalInfoData) => {
    setFormData((prev) => ({ ...prev, personalInfo: data }));
    setCurrentStep("store-info");
  };

  const handleStoreInfoSubmit = (data: StoreInfoData) => {
    setFormData((prev) => ({ ...prev, storeInfo: data }));
    setCurrentStep("account-details");
  };

  const handleAccountDetailsSubmit = async (data: AccountDetailsData) => {
    setFormData((prev) => ({ ...prev, accountDetails: data }));

    // Submit the complete form data to the server
    try {
      // Combine data
      const completeData = {
        ...formData.personalInfo,
        ...formData.storeInfo,
        password: data.password,
        role: "MERCHANT",
      };

      // API call would go here
      console.log("Submitting merchant registration:", completeData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

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

  const handleBackToStoreInfo = () => {
    setCurrentStep("store-info");
  };

  // Store Info Form Component
  const StoreInfoForm = ({
    onSubmit,
    onBack,
    defaultValues,
  }: {
    onSubmit: (data: StoreInfoData) => void;
    onBack: () => void;
    defaultValues?: Partial<StoreInfoData>;
  }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
      register,
      handleSubmit,
      formState: { errors },
    } = useForm<StoreInfoData>({
      resolver: zodResolver(storeInfoSchema),
      defaultValues: {
        storeName: "",
        storeType: "",
        address: "",
        city: "",
        postalCode: "",
        siret: "",
        ...defaultValues,
      },
    });

    const handleFormSubmit = async (data: StoreInfoData) => {
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
            <h2 className="text-2xl font-semibold mb-1">
              Informations du commerce
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Détails sur votre activité commerciale
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="storeName"
              className="text-sm font-medium leading-none"
            >
              Nom du commerce <span className="text-destructive">*</span>
            </label>
            <input
              id="storeName"
              type="text"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.storeName ? "border-destructive" : "border-input"
              }`}
              {...register("storeName")}
            />
            {errors.storeName && (
              <p className="text-sm text-destructive">
                {errors.storeName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="storeType"
              className="text-sm font-medium leading-none"
            >
              Type de commerce <span className="text-destructive">*</span>
            </label>
            <select
              id="storeType"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.storeType ? "border-destructive" : "border-input"
              }`}
              {...register("storeType")}
            >
              <option value="">Sélectionnez un type</option>
              <option value="restaurant">Restaurant</option>
              <option value="grocery">Épicerie</option>
              <option value="bakery">Boulangerie</option>
              <option value="clothing">Vêtements</option>
              <option value="electronics">Électronique</option>
              <option value="other">Autre</option>
            </select>
            {errors.storeType && (
              <p className="text-sm text-destructive">
                {errors.storeType.message}
              </p>
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
              <p className="text-sm text-destructive">
                {errors.address.message}
              </p>
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
                <p className="text-sm text-destructive">
                  {errors.city.message}
                </p>
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
                <p className="text-sm text-destructive">
                  {errors.postalCode.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="siret" className="text-sm font-medium leading-none">
              Numéro SIRET <span className="text-destructive">*</span>
            </label>
            <input
              id="siret"
              type="text"
              placeholder="14 chiffres"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.siret ? "border-destructive" : "border-input"
              }`}
              {...register("siret")}
            />
            {errors.siret && (
              <p className="text-sm text-destructive">{errors.siret.message}</p>
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
        <h1 className="text-3xl font-bold mb-2 text-center">
          Inscription Commerçant
        </h1>
        <p className="text-center text-muted-foreground">
          Rejoignez EcoDeli pour proposer des livraisons à vos clients
        </p>
      </div>

      {/* Progress tracker */}
      <div className="w-full max-w-md mx-auto mb-10">
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2" />

          <div className="relative flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                currentStep === "personal-info"
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              1
            </div>
            <span className="text-xs mt-1">Informations</span>
          </div>

          <div className="relative flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                currentStep === "store-info" ||
                currentStep === "account-details" ||
                currentStep === "confirmation"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <span className="text-xs mt-1">Commerce</span>
          </div>

          <div className="relative flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                currentStep === "account-details" ||
                currentStep === "confirmation"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3
            </div>
            <span className="text-xs mt-1">Compte</span>
          </div>

          <div className="relative flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                currentStep === "confirmation" && registrationComplete
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
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

        {currentStep === "store-info" && (
          <StoreInfoForm
            onSubmit={handleStoreInfoSubmit}
            onBack={handleBackToPersonalInfo}
            defaultValues={formData.storeInfo}
          />
        )}

        {currentStep === "account-details" && (
          <AccountDetails
            onSubmit={handleAccountDetailsSubmit}
            onBack={handleBackToStoreInfo}
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
              Votre compte commerçant a été créé avec succès. Un email de
              confirmation a été envoyé à
              <span className="font-medium text-foreground">
                {" "}
                {formData.personalInfo?.email}
              </span>
              .
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

export default MerchantRegistrationForm;
