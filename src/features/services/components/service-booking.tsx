"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import {
  CalendarIcon,
  Clock,
  MapPin,
  User,
  Star,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/components/ui/use-toast";

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  duration: number;
  provider: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
      city: string;
    };
  };
  averageRating: number;
  totalReviews: number;
}

interface ServiceBookingProps {
  service: Service;
  onBookingComplete?: (bookingId: string) => void;
}

interface BookingFormData {
  scheduledDate: Date | undefined;
  scheduledTime: string;
  address: string;
  notes: string;
}

export function ServiceBooking({
  service,
  onBookingComplete,
}: ServiceBookingProps) {
  const t = useTranslations("client.services.booking");
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    scheduledDate: undefined,
    scheduledTime: "",
    address: "",
    notes: "",
  });

  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.scheduledDate ||
      !formData.scheduledTime ||
      !formData.address
    ) {
      toast({
        title: t("errors.missing_fields"),
        description: t("errors.please_fill_all"),
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: t("errors.not_authenticated"),
        description: t("errors.please_login"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const scheduledDateTime = new Date(formData.scheduledDate);
      const [hours, minutes] = formData.scheduledTime.split(":");
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: service.id,
          scheduledAt: scheduledDateTime.toISOString(),
          address: formData.address,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        const booking = await response.json();

        toast({
          title: t("success.title"),
          description: t("success.description"),
        });

        setIsOpen(false);
        setFormData({
          scheduledDate: undefined,
          scheduledTime: "",
          address: "",
          notes: "",
        });

        if (onBookingComplete) {
          onBookingComplete(booking.id);
        }
      } else {
        const error = await response.json();
        toast({
          title: t("errors.booking_failed"),
          description: error.error || t("errors.try_again"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: t("errors.booking_failed"),
        description: t("errors.network_error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof BookingFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary hover:bg-primary/90">
          {t("book_now")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t("title")} - {service.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("service_details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {service.provider.profile.firstName}{" "}
                    {service.provider.profile.lastName}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {service.provider.profile.city}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {service.duration} {t("minutes")}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">
                    {service.averageRating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({service.totalReviews})
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Badge variant="secondary">{service.category}</Badge>
                <span className="text-2xl font-bold text-primary">
                  {service.price}€
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">{t("date")} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduledDate ? (
                      format(formData.scheduledDate, "PPP", { locale: fr })
                    ) : (
                      <span className="text-muted-foreground">
                        {t("select_date")}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.scheduledDate}
                    onSelect={(date) =>
                      handleInputChange("scheduledDate", date)
                    }
                    disabled={isDateDisabled}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time">{t("time")} *</Label>
              <select
                id="time"
                value={formData.scheduledTime}
                onChange={(e) =>
                  handleInputChange("scheduledTime", e.target.value)
                }
                className="w-full p-3 border border-input rounded-md bg-background"
                required
              >
                <option value="">{t("select_time")}</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">{t("address")} *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder={t("address_placeholder")}
                className="min-h-[80px]"
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder={t("notes_placeholder")}
                className="min-h-[80px]"
              />
            </div>

            {/* Price Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t("total_price")}</span>
                  <span className="text-2xl font-bold text-primary">
                    {service.price}€
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("payment_info")}
                </p>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={
                isLoading ||
                !formData.scheduledDate ||
                !formData.scheduledTime ||
                !formData.address
              }
            >
              {isLoading ? t("booking") : t("confirm_booking")}
            </Button>
          </form>

          {/* Important Information */}
          <div className="flex items-start space-x-2 p-4 bg-blue-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">{t("important.title")}</p>
              <ul className="mt-1 space-y-1">
                <li>• {t("important.cancellation")}</li>
                <li>• {t("important.payment")}</li>
                <li>• {t("important.contact")}</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
