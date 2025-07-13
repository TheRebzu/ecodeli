"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  CheckIcon,
  XIcon,
  AlertCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/use-toast";

interface BookingDetail {
  id: string;
  status: string;
  scheduledAt: string;
  notes?: string;
  totalPrice: number;
  client: {
    user: {
      profile: {
        firstName: string;
        lastName: string;
        phone?: string;
      };
    };
  };
  service: {
    name: string;
    description: string;
    duration: number;
    price: number;
  };
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("provider.bookings");
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const bookingId = params.bookingId as string;

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/provider/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch booking");
      }
      const data = await response.json();
      setBooking(data);
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (action: "accept" | "refuse") => {
    if (!booking) return;

    setActionLoading(true);
    try {
      const endpoint = action === "accept" ? "accept" : "refuse";

      const response = await fetch(
        `/api/provider/bookings/${bookingId}/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason:
              action === "refuse"
                ? "Not available at the requested time"
                : undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update booking");
      }

      const result = await response.json();
      setBooking(result.booking);

      toast({
        title: "Success",
        description: result.message,
      });

      // Redirect to upcoming bookings if accepted
      if (action === "accept") {
        setTimeout(() => {
          router.push("/provider/bookings/upcoming");
        }, 2000);
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", text: "Pending" },
      CONFIRMED: { color: "bg-green-100 text-green-800", text: "Confirmed" },
      IN_PROGRESS: { color: "bg-blue-100 text-blue-800", text: "In Progress" },
      COMPLETED: { color: "bg-gray-100 text-gray-800", text: "Completed" },
      CANCELLED: { color: "bg-red-100 text-red-800", text: "Cancelled" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Booking Not Found</h3>
              <p className="text-muted-foreground">
                The requested booking could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canTakeAction = booking.status === "PENDING";

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          ← Back
        </Button>
        <h1 className="text-3xl font-bold">Booking Details</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Booking Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Service Request
              {getStatusBadge(booking.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{booking.service.name}</h3>
              <p className="text-muted-foreground">
                {booking.service.description}
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(booking.scheduledAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(booking.scheduledAt).toLocaleTimeString()}(
                  {booking.service.duration} minutes)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  Total: €{booking.totalPrice}
                </span>
              </div>
            </div>

            {booking.notes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Client Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {booking.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {booking.client.user.profile.firstName?.[0]}
                  {booking.client.user.profile.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">
                  {booking.client.user.profile.firstName}{" "}
                  {booking.client.user.profile.lastName}
                </h3>
              </div>
            </div>

            {booking.client.user.profile.phone && (
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                <span>{booking.client.user.profile.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {canTakeAction && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Actions Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                onClick={() => handleBookingAction("accept")}
                disabled={actionLoading}
                className="flex-1"
                size="lg"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Accept Booking
              </Button>

              <Button
                onClick={() => handleBookingAction("refuse")}
                disabled={actionLoading}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <XIcon className="h-4 w-4 mr-2" />
                Refuse Booking
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              If you accept this booking, the client will be notified and
              prompted to complete payment. Once payment is confirmed, the
              booking will be finalized.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status Information */}
      {!canTakeAction && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              {booking.status === "CONFIRMED" && (
                <div className="text-green-600">
                  <CheckIcon className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Booking Confirmed
                  </h3>
                  <p>
                    This booking has been accepted. The client will proceed with
                    payment.
                  </p>
                </div>
              )}

              {booking.status === "CANCELLED" && (
                <div className="text-red-600">
                  <XIcon className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Booking Cancelled
                  </h3>
                  <p>This booking has been cancelled.</p>
                </div>
              )}

              {booking.status === "COMPLETED" && (
                <div className="text-gray-600">
                  <CheckIcon className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Service Completed
                  </h3>
                  <p>This service has been completed.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
