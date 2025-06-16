"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Star,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  AlertCircle,
  Plus} from "lucide-react";

// Types
interface Appointment {
  id: string;
  title: string;
  description?: string;
  scheduledDate: Date;
  duration: number;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED";
  type: "SERVICE" | "DELIVERY" | "CONSULTATION";
  location?: string;
  provider: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
    phone?: string;
  };
  service?: {
    id: string;
    name: string;
    category: string;
  };
  notes?: string;
  price?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AppointmentListProps {
  appointments: Appointment[];
  isLoading: boolean;
  error?: string | null;
  onView: (id: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string) => void;
  onBookNew: () => void;
}

// Composant pour afficher un rendez-vous
const AppointmentCard = ({
  appointment,
  onView,
  onCancel,
  onReschedule}: {
  appointment: Appointment;
  onView: (id: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (id: string) => void;
}) => {
  const t = useTranslations("appointments");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "IN_PROGRESS":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      case "RESCHEDULED":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "RESCHEDULED":
        return <RotateCcw className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{appointment.title}</h3>
            <p className="text-sm text-muted-foreground">
              {appointment.description}
            </p>
          </div>
          <Badge
            variant="outline"
            className={getStatusColor(appointment.status)}
          >
            <div className="flex items-center gap-1">
              {getStatusIcon(appointment.status)}
              {t(`status.${appointment.status.toLowerCase()}`)}
            </div>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations du prestataire */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={appointment.provider.image} />
            <AvatarFallback>
              {appointment.provider.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{appointment.provider.name}</p>
            {appointment.provider.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-muted-foreground">
                  {appointment.provider.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Détails du rendez-vous */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(appointment.scheduledDate, "EEEE d MMMM yyyy", { locale })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(appointment.scheduledDate, "HH:mm")}(
              {appointment.duration} min)
            </span>
          </div>

          {appointment.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{appointment.location}</span>
            </div>
          )}

          {appointment.service && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{appointment.service.name}</span>
              <Badge variant="secondary" className="text-xs">
                {appointment.service.category}
              </Badge>
            </div>
          )}

          {appointment.price && (
            <div className="flex items-center justify-between pt-2">
              <span className="font-medium">Prix : {appointment.price}€</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(appointment.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            {t("view")}
          </Button>

          {["PENDING", "CONFIRMED"].includes(appointment.status) && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReschedule(appointment.id)}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {t("reschedule")}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(appointment.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {t("cancel")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export function AppointmentList({
  appointments,
  isLoading,
  error,
  onView,
  onCancel,
  onReschedule,
  onBookNew}: AppointmentListProps) {
  const t = useTranslations("appointments");

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{t("noAppointments")}</h3>
        <p className="text-muted-foreground mb-4">{t("noAppointmentsDesc")}</p>
        <Button onClick={onBookNew}>
          <Plus className="h-4 w-4 mr-2" />
          {t("bookFirst")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onView={onView}
          onCancel={onCancel}
          onReschedule={onReschedule}
        />
      ))}
    </div>
  );
}
