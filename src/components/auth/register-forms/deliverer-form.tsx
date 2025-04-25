"use client";

import React, { useState, useEffect } from "react";
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

// Schema for deliverer information
const delivererInfoSchema = z.object({
  vehicleType: z.string().min(1, {
    message: "Veuillez sélectionner un type de véhicule",
  }),
  licenseNumber: z.string().min(2, {
    message: "Le numéro de permis doit contenir au moins 2 caractères",
  }),
  idCardNumber: z.string().min(2, {
    message:
      "Le numéro de carte d&apos;identité doit contenir au moins 2 caractères",
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
  availability: z.array(z.string()).min(1, {
    message: "Veuillez sélectionner au moins une disponibilité",
  }),
});

type DelivererInfoData = z.infer<typeof delivererInfoSchema>;

type RegistrationStep =
  | "personal-info"
  | "deliverer-info"
  | "account-details"
  | "confirmation";

interface FormData {
  personalInfo?: PersonalInfoData;
  delivererInfo?: DelivererInfoData;
  accountDetails?: AccountDetailsData;
}

export function DelivererRegistrationForm() {
  const [currentStep, setCurrentStep] =
    useState<RegistrationStep>("personal-info");
  const [formData, setFormData] = useState<FormData>({});
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handlePersonalInfoSubmit = (data: PersonalInfoData) => {
    setFormData((prev) => ({ ...prev, personalInfo: data }));
    setCurrentStep("deliverer-info");
  };

  const handleDelivererInfoSubmit = (data: DelivererInfoData) => {
    setFormData((prev) => ({ ...prev, delivererInfo: data }));
    setCurrentStep("account-details");
  };

  const handleAccountDetailsSubmit = async (data: AccountDetailsData) => {
    setFormData((prev) => ({ ...prev, accountDetails: data }));

    // Submit the complete form data to the server
    try {
      // Combine data
      const completeData = {
        ...formData.personalInfo,
        ...formData.delivererInfo,
        password: data.password,
        role: "DELIVERER",
      };

      // API call would go here
      console.log("Submitting deliverer registration:", completeData);

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

  const handleBackToDelivererInfo = () => {
    setCurrentStep("deliverer-info");
  };

  // Deliverer Info Form Component
  const DelivererInfoForm = ({
    onSubmit,
    onBack,
    defaultValues,
  }: {
    onSubmit: (data: DelivererInfoData) => void;
    onBack: () => void;
    defaultValues?: Partial<DelivererInfoData>;
  }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedAvailability, setSelectedAvailability] = useState<string[]>(
      defaultValues?.availability || [],
    );

    const availabilityOptions = [
      { id: "weekday-morning", label: "Semaine - Matin" },
      { id: "weekday-afternoon", label: "Semaine - Après-midi" },
      { id: "weekday-evening", label: "Semaine - Soir" },
      { id: "weekend-morning", label: "Weekend - Matin" },
      { id: "weekend-afternoon", label: "Weekend - Après-midi" },
      { id: "weekend-evening", label: "Weekend - Soir" },
    ];

    const toggleAvailability = (id: string) => {
      setSelectedAvailability((prev) => {
        if (prev.includes(id)) {
          return prev.filter((item) => item !== id);
        } else {
          return [...prev, id];
        }
      });
    };

    const {
      register,
      handleSubmit,
      setValue,
      formState: { errors },
    } = useForm<DelivererInfoData>({
      resolver: zodResolver(delivererInfoSchema),
      defaultValues: {
        vehicleType: "",
        licenseNumber: "",
        idCardNumber: "",
        address: "",
        city: "",
        postalCode: "",
        availability: [],
        ...defaultValues,
      },
    });

    // Update availability field when selectedAvailability changes
    useEffect(() => {
      setValue("availability", selectedAvailability);
    }, [selectedAvailability, setValue]);

    const handleFormSubmit = async (data: DelivererInfoData) => {
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
              Informations livreur
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Détails sur votre activité de livraison
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="vehicleType"
              className="text-sm font-medium leading-none"
            >
              Type de véhicule <span className="text-destructive">*</span>
            </label>
            <select
              id="vehicleType"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.vehicleType ? "border-destructive" : "border-input"
              }`}
              {...register("vehicleType")}
            >
              <option value="">Sélectionnez un type</option>
              <option value="bicycle">Vélo</option>
              <option value="car">Voiture</option>
              <option value="motorcycle">Moto / Scooter</option>
              <option value="van">Camionnette</option>
              <option value="foot">À pied</option>
            </select>
            {errors.vehicleType && (
              <p className="text-sm text-destructive">
                {errors.vehicleType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="licenseNumber"
              className="text-sm font-medium leading-none"
            >
              Numéro de permis <span className="text-destructive">*</span>
            </label>
            <input
              id="licenseNumber"
              type="text"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.licenseNumber ? "border-destructive" : "border-input"
              }`}
              {...register("licenseNumber")}
            />
            {errors.licenseNumber && (
              <p className="text-sm text-destructive">
                {errors.licenseNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="idCardNumber"
              className="text-sm font-medium leading-none"
            >
              Numéro de carte d&apos;identité{" "}
              <span className="text-destructive">*</span>
            </label>
            <input
              id="idCardNumber"
              type="text"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.idCardNumber ? "border-destructive" : "border-input"
              }`}
              {...register("idCardNumber")}
            />
            {errors.idCardNumber && (
              <p className="text-sm text-destructive">
                {errors.idCardNumber.message}
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
            <label className="text-sm font-medium leading-none">
              Disponibilités <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {availabilityOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center p-3 border rounded-md cursor-pointer ${
                    selectedAvailability.includes(option.id)
                      ? "border-primary bg-primary/5"
                      : "border-input"
                  }`}
                  onClick={() => toggleAvailability(option.id)}
                >
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedAvailability.includes(option.id)}
                    onChange={() => {}}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.availability && (
              <p className="text-sm text-destructive">
                {errors.availability.message}
              </p>
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
          Inscription Livreur
        </h1>
        <p className="text-center text-muted-foreground">
          Rejoignez EcoDeli en tant que livreur et gagnez de l&apos;argent en
          livrant des colis
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
                currentStep === "deliverer-info" ||
                currentStep === "account-details" ||
                currentStep === "confirmation"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <span className="text-xs mt-1">Livraison</span>
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

        {currentStep === "deliverer-info" && (
          <DelivererInfoForm
            onSubmit={handleDelivererInfoSubmit}
            onBack={handleBackToPersonalInfo}
            defaultValues={formData.delivererInfo}
          />
        )}

        {currentStep === "account-details" && (
          <AccountDetails
            onSubmit={handleAccountDetailsSubmit}
            onBack={handleBackToDelivererInfo}
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
              Votre compte livreur a été créé avec succès. Un email de
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

export default DelivererRegistrationForm;
