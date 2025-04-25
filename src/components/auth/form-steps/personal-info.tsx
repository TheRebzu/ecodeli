"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for personal information
const personalInfoSchema = z.object({
  firstName: z.string().min(2, {
    message: "Le prénom doit contenir au moins 2 caractères",
  }),
  lastName: z.string().min(2, {
    message: "Le nom doit contenir au moins 2 caractères",
  }),
  email: z.string().email({
    message: "Veuillez saisir une adresse email valide",
  }),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, {
      message: "Veuillez saisir un numéro de téléphone valide",
    })
    .optional(),
});

export type PersonalInfoData = z.infer<typeof personalInfoSchema>;

interface PersonalInfoProps {
  defaultValues?: Partial<PersonalInfoData>;
  onSubmit: (data: PersonalInfoData) => void;
  onBack?: () => void;
  isFirstStep?: boolean;
}

export function PersonalInfo({
  defaultValues,
  onSubmit,
  onBack,
  isFirstStep = true,
}: PersonalInfoProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      ...defaultValues,
    },
  });

  const handleFormSubmit = async (data: PersonalInfoData) => {
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
            Informations personnelles
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Parlez-nous un peu de vous
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="firstName"
              className="text-sm font-medium leading-none"
            >
              Prénom <span className="text-destructive">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.firstName ? "border-destructive" : "border-input"
              }`}
              {...register("firstName")}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="lastName"
              className="text-sm font-medium leading-none"
            >
              Nom <span className="text-destructive">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
                errors.lastName ? "border-destructive" : "border-input"
              }`}
              {...register("lastName")}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium leading-none">
            Email <span className="text-destructive">*</span>
          </label>
          <input
            id="email"
            type="email"
            className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
              errors.email ? "border-destructive" : "border-input"
            }`}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium leading-none">
            Téléphone
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+33612345678"
            className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${
              errors.phone ? "border-destructive" : "border-input"
            }`}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        {!isFirstStep && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-input rounded-md text-sm font-medium"
          >
            Retour
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${
            isFirstStep ? "ml-auto" : ""
          } px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Chargement..." : "Continuer"}
        </button>
      </div>
    </form>
  );
}

export default PersonalInfo;
