import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookingForm } from "@/components/client/services/service-booking-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Suspense } from "react";
import { Loader2, Home, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { api } from "@/trpc/server";
import { formatServicePrice } from "@/types/client/services";

interface BookPageProps {
  searchParams: Promise<{
    serviceId?: string;
    date?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("services");

  return {
    title: "Réserver un service",
    description: "Réservez votre service avec un prestataire vérifié"
  };
}

export default async function BookPage({ searchParams }: BookPageProps) {
  const t = await getTranslations("services");
  const { serviceId, date } = await searchParams;

  // Rediriger vers la liste des services si l'ID du service n'est pas fourni
  if (!serviceId) {
    redirect("/client/services");
  }

  try {
    const service = await api.clientServices.getServiceDetails.query({ serviceId });

    // Convertir la date si fournie
    const selectedDate = date ? new Date(date) : null;

    return (
      <div className="container py-6 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} href="/client">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink
                as={Link}
                href="/client/services"
              >
                Services
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink
                as={Link}
                href={`/client/services/${serviceId}`}
              >
                {service.title}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Réservation</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold tracking-tight">
          Réserver ce service
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Réserver maintenant</CardTitle>
                <CardDescription>
                  Complétez votre réservation pour le service "{service.title}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                  }
                >
                  <BookingForm
                    service={service}
                    selectedDate={selectedDate}
                    onCancel={() => redirect(`/client/services/${serviceId}`)}
                    onSuccess={(bookingId) => redirect(`/client/services/bookings/${bookingId}`)}
                  />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">{service.title}</h3>
                    <p className="text-sm text-gray-500">
                      {service.category}
                    </p>
                    <p className="text-sm text-gray-500">
                      Prestataire: {service.providerName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">
                      {service.providerRating} ({service.providerReviews} avis)
                    </span>
                  </div>

                  <div>
                    <h3 className="font-medium">Prix</h3>
                    <p className="text-xl font-bold">
                      {formatServicePrice(
                        service.pricing.price,
                        service.pricing.currency,
                        service.pricing.priceType
                      )}
                    </p>
                  </div>

                  {service.duration && (
                    <div>
                      <h3 className="font-medium">Durée</h3>
                      <p className="text-sm text-gray-500">{service.duration} minutes</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    redirect("/client/services");
  }
}
