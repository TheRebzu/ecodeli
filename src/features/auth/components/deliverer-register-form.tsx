"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  delivererRegisterSchema,
  type DelivererRegisterData,
} from "@/features/auth/schemas/auth.schema";

export function DelivererRegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DelivererRegisterData>({
    resolver: zodResolver(delivererRegisterSchema),
    defaultValues: {
      vehicleType: "CAR",
      maxWeight: 20,
      maxDistance: 50,
    },
  });

  const onSubmit = async (data: DelivererRegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          role: "DELIVERER",
          // Propriétés additionnelles pour NextAuth
          isActive: false,
          validationStatus: "PENDING",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Une erreur est survenue");
        return;
      }

      // Redirection vers la page de vérification email
      router.push("/verify-email?email=" + encodeURIComponent(data.email));
    } catch (err) {
      setError("Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const vehicleTypes = [
    { value: "WALKING", label: "🚶 À pied", maxWeight: 5 },
    { value: "BIKE", label: "🚴 Vélo", maxWeight: 15 },
    { value: "SCOOTER", label: "🛵 Scooter", maxWeight: 25 },
    { value: "CAR", label: "🚗 Voiture", maxWeight: 50 },
    { value: "TRUCK", label: "🚛 Camionnette", maxWeight: 200 },
  ];

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
          Téléphone *
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

      <div>
        <label
          htmlFor="vehicleType"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Mode de transport *
        </label>
        <select
          {...register("vehicleType")}
          id="vehicleType"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          {vehicleTypes.map((vehicle) => (
            <option key={vehicle.value} value={vehicle.value}>
              {vehicle.label} (max {vehicle.maxWeight}kg)
            </option>
          ))}
        </select>
        {errors.vehicleType && (
          <p className="mt-1 text-sm text-red-600">
            {errors.vehicleType.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="maxWeight"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Poids max (kg) *
          </label>
          <input
            {...register("maxWeight", { valueAsNumber: true })}
            type="number"
            id="maxWeight"
            min="1"
            max="1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {errors.maxWeight && (
            <p className="mt-1 text-sm text-red-600">
              {errors.maxWeight.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="maxDistance"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Distance max (km) *
          </label>
          <input
            {...register("maxDistance", { valueAsNumber: true })}
            type="number"
            id="maxDistance"
            min="1"
            max="500"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {errors.maxDistance && (
            <p className="mt-1 text-sm text-red-600">
              {errors.maxDistance.message}
            </p>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          📄 <strong>Documents requis :</strong> Après inscription, vous devrez
          fournir une pièce d'identité et un justificatif de transport pour
          validation.
        </p>
      </div>

      <div className="text-xs text-gray-500">
        En créant un compte, vous acceptez nos{" "}
        <a href="/terms" className="text-green-600 hover:underline">
          Conditions d'utilisation
        </a>{" "}
        et notre{" "}
        <a href="/privacy" className="text-green-600 hover:underline">
          Politique de confidentialité
        </a>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? "Création en cours..." : "Devenir livreur EcoDeli"}
      </button>
    </form>
  );
}
