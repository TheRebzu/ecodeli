"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  providerRegisterSchema,
  type ProviderRegisterData,
} from "@/features/auth/schemas/auth.schema";

export function ProviderRegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProviderRegisterData>({
    resolver: zodResolver(providerRegisterSchema),
    defaultValues: {
      specialties: [],
    },
  });

  const specialtyOptions = [
    { value: "TRANSPORT", label: "Transport de personnes" },
    { value: "HOME_CLEANING", label: "Ménage à domicile" },
    { value: "GARDENING", label: "Jardinage" },
    { value: "PET_CARE", label: "Garde d'animaux" },
    { value: "TUTORING", label: "Cours particuliers" },
    { value: "HANDYMAN", label: "Petits travaux" },
    { value: "OTHER", label: "Autre" },
  ];

  const onSubmit = async (data: ProviderRegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Préparer les données pour l'API backend
      const apiData = {
        email: data.email,
        password: data.password,
        firstName: data.name.split(" ")[0],
        lastName: data.name.split(" ").slice(1).join(" ") || data.name.split(" ")[0],
        phone: data.phone || "",
        role: "PROVIDER" as const,
        businessName: data.businessName,
        specialties: data.specialties,
        hourlyRate: data.hourlyRate,
        description: data.description,
      };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Une erreur est survenue");
        return;
      }

      // Redirection avec message de succès et demande de validation
      router.push(
        "/fr/login?message=Compte prestataire créé avec succès ! Vérifiez votre email pour activer votre compte. Votre demande sera ensuite validée par nos équipes sous 24-48h.",
      );
    } catch (err) {
      setError("Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nom complet *
        </label>
        <input
          {...register("name")}
          type="text"
          id="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Votre nom complet"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email *
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="votre@email.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Téléphone
        </label>
        <input
          {...register("phone")}
          type="tel"
          id="phone"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="+33 6 12 34 56 78"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="businessName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nom de votre entreprise *
        </label>
        <input
          {...register("businessName")}
          type="text"
          id="businessName"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Nom de votre entreprise ou auto-entreprise"
        />
        {errors.businessName && (
          <p className="mt-1 text-sm text-red-600">
            {errors.businessName.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Spécialités * (1 à 5 maximum)
        </label>
        <div className="grid grid-cols-1 gap-2">
          {specialtyOptions.map((option) => (
            <label key={option.value} className="flex items-center space-x-2">
              <input
                {...register("specialties")}
                type="checkbox"
                value={option.value}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.specialties && (
          <p className="mt-1 text-sm text-red-600">
            {errors.specialties.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="hourlyRate"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Tarif horaire (€) *
        </label>
        <input
          {...register("hourlyRate", { valueAsNumber: true })}
          type="number"
          id="hourlyRate"
          min="10"
          max="200"
          step="0.50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="25"
        />
        {errors.hourlyRate && (
          <p className="mt-1 text-sm text-red-600">
            {errors.hourlyRate.message}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Entre 10€ et 200€ par heure
        </p>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description de vos services *
        </label>
        <textarea
          {...register("description")}
          id="description"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Décrivez votre expérience, vos qualifications et les services que vous proposez..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Minimum 50 caractères, maximum 500 caractères
        </p>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Mot de passe *
        </label>
        <input
          {...register("password")}
          type="password"
          id="password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Mot de passe sécurisé"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Confirmer le mot de passe *
        </label>
        <input
          {...register("confirmPassword")}
          type="password"
          id="confirmPassword"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Confirmer le mot de passe"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Informations importantes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">
          Informations importantes
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Vous devez être autoentrepreneur ou avoir un statut d'indépendant
          </li>
          <li>
            • Votre compte sera validé sous 24-48h après vérification de vos
            documents
          </li>
          <li>
            • Vous devrez fournir des justificatifs (SIRET, assurance, etc.)
          </li>
          <li>
            • Les paiements sont effectués mensuellement par virement bancaire
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="terms"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
            required
          />
          <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
            J'accepte les{" "}
            <a
              href="/fr/terms"
              target="_blank"
              className="text-green-600 hover:underline"
            >
              Conditions d'utilisation
            </a>{" "}
            et la{" "}
            <a
              href="/fr/privacy"
              target="_blank"
              className="text-green-600 hover:underline"
            >
              Politique de confidentialité
            </a>{" "}
            d'EcoDeli *
          </label>
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="autoentrepreneur"
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
            required
          />
          <label htmlFor="autoentrepreneur" className="ml-2 text-sm text-gray-700">
            Je certifie avoir un statut d'autoentrepreneur ou d'indépendant
            valide *
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? "Création en cours..." : "Créer mon compte prestataire"}
      </button>
    </form>
  );
}