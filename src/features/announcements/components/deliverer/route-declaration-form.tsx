"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const routeDeclarationSchema = z.object({
  startAddress: z.string().min(5, "L'adresse de départ est requise"),
  endAddress: z.string().min(5, "L'adresse d'arrivée est requise"),
  departureTime: z.string().min(1, "L'heure de départ est requise"),
  estimatedArrival: z.string().min(1, "L'heure d'arrivée estimée est requise"),
  vehicleType: z.enum([
    "CAR",
    "MOTORCYCLE",
    "BICYCLE",
    "SCOOTER",
    "VAN",
    "TRUCK",
  ]),
  maxWeight: z.number().min(0.1, "Le poids maximum doit être supérieur à 0"),
  maxVolume: z.number().min(0.1, "Le volume maximum doit être supérieur à 0"),
  acceptedServiceTypes: z
    .array(z.enum(["PACKAGE", "SERVICE", "CART_DROP"]))
    .min(1, "Sélectionnez au moins un type de service"),
  recurring: z.boolean().default(false),
  recurringDays: z
    .array(
      z.enum([
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ]),
    )
    .optional(),
  notes: z.string().optional(),
  pricePerKm: z
    .number()
    .min(0.1, "Le prix par km doit être supérieur à 0")
    .optional(),
  minimumPrice: z
    .number()
    .min(1, "Le prix minimum doit être supérieur à 0")
    .optional(),
});

type RouteDeclarationData = z.infer<typeof routeDeclarationSchema>;

interface RouteDeclarationFormProps {
  onSuccess?: (route: any) => void;
  onCancel?: () => void;
  initialData?: Partial<RouteDeclarationData>;
}

export function RouteDeclarationForm({
  onSuccess,
  onCancel,
  initialData,
}: RouteDeclarationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RouteDeclarationData>({
    resolver: zodResolver(routeDeclarationSchema),
    defaultValues: {
      vehicleType: "CAR",
      maxWeight: 20,
      maxVolume: 50,
      acceptedServiceTypes: ["PACKAGE"],
      recurring: false,
      pricePerKm: 1.5,
      minimumPrice: 5,
      ...initialData,
    },
  });

  const vehicleType = watch("vehicleType");
  const isRecurring = watch("recurring");
  const acceptedServiceTypes = watch("acceptedServiceTypes");

  const vehicleOptions = [
    { value: "BICYCLE", label: "🚲 Vélo", maxWeight: 5, maxVolume: 10 },
    { value: "SCOOTER", label: "🛵 Scooter", maxWeight: 10, maxVolume: 20 },
    { value: "MOTORCYCLE", label: "🏍️ Moto", maxWeight: 15, maxVolume: 25 },
    { value: "CAR", label: "🚗 Voiture", maxWeight: 50, maxVolume: 100 },
    { value: "VAN", label: "🚐 Camionnette", maxWeight: 500, maxVolume: 500 },
    { value: "TRUCK", label: "🚚 Camion", maxWeight: 3500, maxVolume: 1000 },
  ];

  const serviceTypeOptions = [
    { value: "PACKAGE", label: "📦 Livraison de colis" },
    { value: "SERVICE", label: "🛠️ Services à domicile" },
    { value: "CART_DROP", label: "🛒 Lâcher de chariot" },
  ];

  const dayOptions = [
    { value: "MONDAY", label: "Lundi" },
    { value: "TUESDAY", label: "Mardi" },
    { value: "WEDNESDAY", label: "Mercredi" },
    { value: "THURSDAY", label: "Jeudi" },
    { value: "FRIDAY", label: "Vendredi" },
    { value: "SATURDAY", label: "Samedi" },
    { value: "SUNDAY", label: "Dimanche" },
  ];

  const updateVehicleLimits = (vehicle: string) => {
    const selectedVehicle = vehicleOptions.find((v) => v.value === vehicle);
    if (selectedVehicle) {
      setValue("maxWeight", selectedVehicle.maxWeight);
      setValue("maxVolume", selectedVehicle.maxVolume);
    }
  };

  const onSubmit = async (data: RouteDeclarationData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/deliverer/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Erreur lors de la déclaration du trajet",
        );
      }

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Déclarer un trajet
        </h2>
        <p className="text-gray-600">
          Indiquez vos trajets prévus pour recevoir des opportunités de
          livraison correspondantes.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Itinéraire */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="startAddress"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Adresse de départ *
            </label>
            <textarea
              {...register("startAddress")}
              id="startAddress"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Adresse complète de départ"
            />
            {errors.startAddress && (
              <p className="mt-1 text-sm text-red-600">
                {errors.startAddress.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="endAddress"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Adresse d'arrivée *
            </label>
            <textarea
              {...register("endAddress")}
              id="endAddress"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Adresse complète d'arrivée"
            />
            {errors.endAddress && (
              <p className="mt-1 text-sm text-red-600">
                {errors.endAddress.message}
              </p>
            )}
          </div>
        </div>

        {/* Horaires */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="departureTime"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Heure de départ *
            </label>
            <input
              {...register("departureTime")}
              type="datetime-local"
              id="departureTime"
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.departureTime && (
              <p className="mt-1 text-sm text-red-600">
                {errors.departureTime.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="estimatedArrival"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Arrivée estimée *
            </label>
            <input
              {...register("estimatedArrival")}
              type="datetime-local"
              id="estimatedArrival"
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.estimatedArrival && (
              <p className="mt-1 text-sm text-red-600">
                {errors.estimatedArrival.message}
              </p>
            )}
          </div>
        </div>

        {/* Type de véhicule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Type de véhicule *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {vehicleOptions.map((vehicle) => (
              <label key={vehicle.value} className="relative">
                <input
                  {...register("vehicleType")}
                  type="radio"
                  value={vehicle.value}
                  onChange={(e) => {
                    updateVehicleLimits(e.target.value);
                  }}
                  className="sr-only peer"
                />
                <div className="border-2 border-gray-200 rounded-lg p-3 cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 hover:border-green-300 transition-colors">
                  <div className="text-center">
                    <div className="text-lg mb-1">{vehicle.label}</div>
                    <div className="text-xs text-gray-500">
                      Max: {vehicle.maxWeight}kg
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.vehicleType && (
            <p className="mt-1 text-sm text-red-600">
              {errors.vehicleType.message}
            </p>
          )}
        </div>

        {/* Capacités */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="maxWeight"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Poids maximum (kg) *
            </label>
            <input
              {...register("maxWeight", { valueAsNumber: true })}
              type="number"
              step="0.5"
              min="0.1"
              id="maxWeight"
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
              htmlFor="maxVolume"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Volume maximum (L) *
            </label>
            <input
              {...register("maxVolume", { valueAsNumber: true })}
              type="number"
              step="5"
              min="0.1"
              id="maxVolume"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.maxVolume && (
              <p className="mt-1 text-sm text-red-600">
                {errors.maxVolume.message}
              </p>
            )}
          </div>
        </div>

        {/* Types de services acceptés */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Types de services acceptés *
          </label>
          <div className="space-y-2">
            {serviceTypeOptions.map((service) => (
              <label key={service.value} className="flex items-center">
                <input
                  type="checkbox"
                  value={service.value}
                  {...register("acceptedServiceTypes")}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {service.label}
                </span>
              </label>
            ))}
          </div>
          {errors.acceptedServiceTypes && (
            <p className="mt-1 text-sm text-red-600">
              {errors.acceptedServiceTypes.message}
            </p>
          )}
        </div>

        {/* Tarification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="pricePerKm"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Prix par km (€)
            </label>
            <input
              {...register("pricePerKm", { valueAsNumber: true })}
              type="number"
              step="0.1"
              min="0.1"
              id="pricePerKm"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.pricePerKm && (
              <p className="mt-1 text-sm text-red-600">
                {errors.pricePerKm.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="minimumPrice"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Prix minimum (€)
            </label>
            <input
              {...register("minimumPrice", { valueAsNumber: true })}
              type="number"
              step="0.5"
              min="1"
              id="minimumPrice"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.minimumPrice && (
              <p className="mt-1 text-sm text-red-600">
                {errors.minimumPrice.message}
              </p>
            )}
          </div>
        </div>

        {/* Récurrence */}
        <div>
          <div className="flex items-center mb-3">
            <input
              {...register("recurring")}
              type="checkbox"
              id="recurring"
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label
              htmlFor="recurring"
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Trajet récurrent
            </label>
          </div>

          {isRecurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jours de la semaine
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {dayOptions.map((day) => (
                  <label key={day.value} className="flex items-center">
                    <input
                      type="checkbox"
                      value={day.value}
                      {...register("recurringDays")}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {day.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notes additionnelles
          </label>
          <textarea
            {...register("notes")}
            id="notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Contraintes particulières, détours possibles, etc."
          />
        </div>

        {/* Boutons */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Déclaration en cours..." : "Déclarer le trajet"}
          </button>
        </div>
      </form>
    </div>
  );
}
