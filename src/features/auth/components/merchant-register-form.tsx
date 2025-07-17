"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  merchantRegisterSchema,
  type MerchantRegisterData,
} from "@/features/auth/schemas/auth.schema";

export function MerchantRegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const t = useTranslations();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MerchantRegisterData>({
    resolver: zodResolver(merchantRegisterSchema),
    defaultValues: {
      businessType: "RETAIL",
    },
  });

  const onSubmit = async (data: MerchantRegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.name.split(' ')[0] || data.name,
          lastName: data.name.split(' ').slice(1).join(' ') || data.name,
          role: "MERCHANT",
          phone: data.phone,
          address: data.address,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Une erreur est survenue");
        return;
      }

      router.push("/login?message=Inscription réussie ! Veuillez vous connecter.");
    } catch (err) {
      setError("Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const businessTypes = [
    { value: "RETAIL", label: "Commerce de détail" },
    { value: "RESTAURANT", label: "Restaurant / Alimentation" },
    { value: "SERVICES", label: "Services" },
    { value: "OTHER", label: "Autre" },
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
          Nom du responsable *
        </label>
        <input
          {...register("name")}
          type="text"
          id="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Prénom Nom"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="businessName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nom de l'entreprise *
        </label>
        <input
          {...register("businessName")}
          type="text"
          id="businessName"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Nom de votre entreprise"
        />
        {errors.businessName && (
          <p className="mt-1 text-sm text-red-600">
            {errors.businessName.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="businessType"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Type d'activité *
        </label>
        <select
          {...register("businessType")}
          id="businessType"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          {businessTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.businessType && (
          <p className="mt-1 text-sm text-red-600">
            {errors.businessType.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="siret"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          SIRET *
        </label>
        <input
          {...register("siret")}
          type="text"
          id="siret"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="12345678901234"
          maxLength={14}
        />
        {errors.siret && (
          <p className="mt-1 text-sm text-red-600">{errors.siret.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="address"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Adresse de l'entreprise *
        </label>
        <textarea
          {...register("address")}
          id="address"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Adresse complète de votre entreprise"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email professionnel *
        </label>
        <input
          {...register("email")}
          type="email"
          id="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="contact@entreprise.com"
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
          placeholder="+33 1 23 45 67 89"
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          📄 <strong>Validation requise :</strong> Votre compte sera vérifié par
          notre équipe dans les 24-48h après inscription.
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
        {isLoading ? "Création en cours..." : "Rejoindre EcoDeli"}
      </button>
    </form>
  );
}

export default MerchantRegisterForm;
