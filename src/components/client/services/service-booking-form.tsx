"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CreditCard,
  CheckCircle,
  Calendar,
  User,
  MapPin,
  Loader2
} from "lucide-react";
import { TimeslotPicker } from "@/components/schedule/timeslot-picker";
import { useClientServices } from "@/hooks/client/use-client-services";
import { 
  type ServiceSearchResult, 
  type CreateBookingData,
  formatServicePrice 
} from "@/types/client/services";
import { cn } from "@/lib/utils/common";

// Schema de validation pour le formulaire de réservation
const createBookingSchema = z.object({
  serviceId: z.string().min(1, "Service requis"),
  providerId: z.string().min(1, "Prestataire requis"),
  date: z.string().min(1, "Date requise"),
  startTime: z.string().min(1, "Heure de début requise"),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(["card", "appWallet", "paypal"]),
  participantCount: z.number().min(1).default(1),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Vous devez accepter les conditions générales",
  }),
});

type BookingFormData = z.infer<typeof createBookingSchema>;

interface BookingFormProps {
  service: ServiceSearchResult;
  selectedDate: Date | null;
  onCancel: () => void;
  onSuccess?: (bookingId: string) => void;
  showAdvancedOptions?: boolean;
}

/**
 * Formulaire de réservation de service
 */
export function BookingForm({
  service,
  selectedDate,
  onCancel,
  onSuccess,
  showAdvancedOptions = true
}: BookingFormProps) {
  const t = useTranslations("services");
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  
  const { createBooking } = useClientServices();

  // Formatage des dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Données du formulaire
  const form = useForm<BookingFormData>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      serviceId: service.id,
      providerId: service.providerId,
      date: selectedDate ? selectedDate.toISOString().split("T")[0] : "",
      startTime: "",
      notes: "",
      paymentMethod: "card",
      participantCount: 1,
      termsAccepted: false,
    },
  });

  const { isSubmitting } = form.formState;

  // Soumission du formulaire
  const onSubmit = async (data: BookingFormData) => {
    if (!selectedDate) return;

    try {
      const bookingData: CreateBookingData = {
        serviceId: data.serviceId,
        providerId: data.providerId,
        scheduledDate: selectedDate,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes,
        paymentMethod: data.paymentMethod as "card" | "wallet" | "paypal",
        clientLocation: {
          address: "",
          city: "",
          postalCode: "",
          coordinates: { lat: 0, lng: 0 },
        },
      };

      const booking = await createBooking(bookingData);
      onSuccess?.(booking.id);
    } catch (error) {
      console.error("Booking error:", error);
    }
  };

  if (!selectedDate) {
    return (
      <div className="text-center py-4">
        <p className="text-red-500">Veuillez d&apos;abord sélectionner une date</p>
        <Button onClick={onCancel} variant="outline" className="mt-2">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec informations du service */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Réserver ce service</h2>
            <p className="text-muted-foreground">{service.title}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowServiceDetails(!showServiceDetails)}
          >
            {showServiceDetails ? "Masquer les détails" : "Voir les détails"}
          </Button>
        </div>

        {showServiceDetails && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Informations du service */}
              <div>
                <h4 className="font-medium mb-2">Informations du service</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {service.duration
                        ? `${service.duration} min`
                        : "Durée variable"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {formatServicePrice(
                        service.pricing.price,
                        service.pricing.currency,
                        service.pricing.priceType
                      )}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-muted-foreground">
                      {service.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Informations du prestataire */}
              <div>
                <h4 className="font-medium mb-2">Prestataire</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{service.providerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{service.location.serviceArea}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Date et heure */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Rendez-vous
            </h3>

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled
                      value={formatDate(selectedDate)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heure de début</FormLabel>
                  <FormControl>
                    <TimeslotPicker
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        setSelectedTimeSlot(value);
                      }}
                      placeholder="Sélectionner une heure"
                      mode="start"
                      minTime="06:00"
                      maxTime="22:00"
                      step={15}
                      showQuickSelect={true}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Options avancées */}
          {showAdvancedOptions && (
            <div className="space-y-4">
              <h3 className="font-medium">Options avancées</h3>

              {/* Nombre de participants */}
              <FormField
                control={form.control}
                name="participantCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de participants</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newCount = Math.max(1, field.value - 1);
                            field.onChange(newCount);
                          }}
                          disabled={field.value <= 1}
                        >
                          -
                        </Button>
                        <span className="w-16 text-center">
                          {field.value}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newCount = field.value + 1;
                            field.onChange(newCount);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Separator />

          {/* Notes spéciales */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes spéciales</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Ajoutez des informations supplémentaires pour le prestataire..."
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Méthode de paiement */}
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Méthode de paiement</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="card" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Carte bancaire
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="appWallet" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Portefeuille de l&apos;app
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="paypal" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        PayPal
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Récapitulatif */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Récapitulatif</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Prix du service</span>
                <span>
                  {formatServicePrice(
                    service.pricing.price,
                    service.pricing.currency,
                    service.pricing.priceType
                  )}
                </span>
              </div>

              {showAdvancedOptions && form.watch("participantCount") > 1 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    Participants (x{form.watch("participantCount")})
                  </span>
                  <span>
                    {formatServicePrice(
                      service.pricing.price * form.watch("participantCount"),
                      service.pricing.currency,
                      service.pricing.priceType
                    )}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between font-medium text-base">
                <span>Total</span>
                <span className="text-primary">
                  {formatServicePrice(
                    service.pricing.price * (showAdvancedOptions ? form.watch("participantCount") : 1),
                    service.pricing.currency,
                    service.pricing.priceType
                  )}
                </span>
              </div>

              {selectedTimeSlot && selectedDate && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">
                      {formatDate(selectedDate)} à {selectedTimeSlot}
                      {service.duration && ` (${service.duration} min)`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conditions générales */}
          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      type="checkbox"
                      required
                      className="w-4 h-4"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </div>
                </FormControl>
                <div className="text-sm">
                  J&apos;accepte les{" "}
                  <Link
                    href="/terms"
                    className="text-primary hover:underline"
                  >
                    conditions générales
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                  >
                    politique de confidentialité
                  </Link>
                </div>
              </FormItem>
            )}
          />

          {/* Boutons d'action */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                isSubmitting || !form.formState.isValid || !selectedTimeSlot
              }
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </span>
              ) : (
                <span className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmer la réservation
                  {showAdvancedOptions && form.watch("participantCount") > 1 && (
                    <span className="ml-1">({form.watch("participantCount")})</span>
                  )}
                </span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
