import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BookingForm } from "@/components/client/services/service-booking-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Suspense } from "react";
import { Loader2, Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/trpc/server";

interface BookPageProps {
  searchParams: Promise<{
    serviceId?: string;
    date?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("services.booking");

  return {
    title: t("form.title"),
    description: t("form.description"),
  };
}

export default async function BookPage({ searchParams }: BookPageProps) {
  const t = await getTranslations("services");
  const { serviceId, date } = await searchParams;

  // Rediriger vers la liste des services si l'ID du service n'est pas fourni
  if (!serviceId) {
    redirect("/[locale]/(protected)/client/services");
  }

  try {
    const service = await api.service.getServiceById.query({
      id: serviceId,
    });

    // Convertir la date si fournie
    const selectedDate = date ? new Date(date) : null;

    return (
      <div className="container py-6 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} href="/[locale]/(protected)/client">
                <Home className="h-4 w-4" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink
                as={Link}
                href="/[locale]/(protected)/client/services"
              >
                {t("list.title")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink
                as={Link}
                href={`/[locale]/(protected)/client/services/${serviceId}`}
              >
                {service.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{t("booking.form.title")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="text-3xl font-bold tracking-tight">
          {t("booking.form.title")}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("booking.form.bookNow")}</CardTitle>
                <CardDescription>
                  {t("booking.form.completeBooking", { service: service.name })}
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
                    onCancel={() =>
                      redirect(
                        `/[locale]/(protected)/client/services/${serviceId}`,
                      )
                    }
                  />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t("booking.summary.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">{service.name}</h3>
                    <p className="text-sm text-gray-500">
                      {service.category.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("booking.summary.provider")}: {service.provider.name}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium">
                      {t("booking.summary.price")}
                    </h3>
                    <p className="text-xl font-bold">
                      {service.price.toFixed(2)} €
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    redirect("/[locale]/(protected)/client/services");
  }
}
