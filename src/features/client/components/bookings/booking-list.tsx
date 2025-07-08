"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Phone, Star, X, CreditCard } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface BookingListProps {
  clientId: string;
}

interface Booking {
  id: string;
  providerName: string;
  providerPhone: string;
  providerAvatar?: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  status: string;
  price: number;
  estimatedDuration: number;
  notes?: string;
  rating?: number;
  review?: string;
  createdAt: string;
  payment?: {
    id: string;
    status: string;
    amount: number;
    paymentMethod: string;
    paidAt?: string;
  } | null;
  isPaid?: boolean;
}

export default function BookingList({ clientId }: BookingListProps) {
  const t = useTranslations("client.bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/client/bookings");
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error(t("error.fetch_failed"));
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      if (response.ok) {
        toast.success(t("success.booking_cancelled"));
        fetchBookings();
        setShowCancelDialog(false);
        setSelectedBooking(null);
      } else {
        toast.error(t("error.cancel_failed"));
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error(t("error.cancel_failed"));
    }
  };

  const submitRating = async () => {
    if (!selectedBooking || rating === 0) return;

    try {
      const response = await fetch(`/api/client/bookings/${selectedBooking.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, review }),
      });

      if (response.ok) {
        toast.success(t("success.rating_submitted"));
        fetchBookings();
        setShowRatingDialog(false);
        setSelectedBooking(null);
        setRating(0);
        setReview("");
      } else {
        toast.error(t("error.rating_failed"));
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error(t("error.rating_failed"));
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [clientId]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", label: t("status.pending") },
      confirmed: { color: "bg-blue-100 text-blue-800", label: t("status.confirmed") },
      in_progress: { color: "bg-purple-100 text-purple-800", label: t("status.in_progress") },
      completed: { color: "bg-green-100 text-green-800", label: t("status.completed") },
      cancelled: { color: "bg-red-100 text-red-800", label: t("status.cancelled") },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const activeBookings = bookings.filter(b => !["completed", "cancelled"].includes(b.status));
  const pastBookings = bookings.filter(b => ["completed", "cancelled"].includes(b.status));

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            {t("tabs.active")} ({activeBookings.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            {t("tabs.history")} ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("empty.no_active_bookings")}
                </h3>
                <p className="text-gray-600">{t("empty.book_service_description")}</p>
              </CardContent>
            </Card>
          ) : (
            activeBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{booking.serviceType}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{booking.providerName}</p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(booking.scheduledDate).toLocaleDateString()} à {booking.scheduledTime}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {booking.estimatedDuration} minutes
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      {booking.address}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {booking.providerPhone}
                    </div>
                  </div>
                  
                  {booking.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-700">{booking.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-green-600">
                      {booking.price}€
                    </span>
                    <div className="space-x-2">
                      {!booking.isPaid && ["pending", "confirmed"].includes(booking.status) && (
                        <Link href={`/client/bookings/${booking.id}/payment`}>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <CreditCard className="h-4 w-4 mr-1" />
                            {t("actions.pay")}
                          </Button>
                        </Link>
                      )}
                      {booking.status === "pending" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowCancelDialog(true);
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t("actions.cancel")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("empty.no_past_bookings")}
                </h3>
                <p className="text-gray-600">{t("empty.past_bookings_description")}</p>
              </CardContent>
            </Card>
          ) : (
            pastBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{booking.serviceType}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{booking.providerName}</p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(booking.scheduledDate).toLocaleDateString()} à {booking.scheduledTime}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {booking.estimatedDuration} minutes
                    </div>
                  </div>

                  {booking.rating && (
                    <div className="mb-4 p-3 bg-blue-50 rounded">
                      <div className="flex items-center mb-2">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">{booking.rating}/5</span>
                      </div>
                      {booking.review && (
                        <p className="text-sm text-gray-700">{booking.review}</p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-green-600">
                      {booking.price}€
                    </span>
                    {booking.status === "completed" && !booking.rating && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowRatingDialog(true);
                        }}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        {t("actions.rate")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.cancel.title")}</DialogTitle>
            <DialogDescription>
              {t("dialogs.cancel.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              {t("dialogs.cancel.keep")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedBooking && cancelBooking(selectedBooking.id)}
            >
              {t("dialogs.cancel.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogs.rating.title")}</DialogTitle>
            <DialogDescription>
              {t("dialogs.rating.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("dialogs.rating.rating_label")}</label>
              <div className="flex space-x-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 ${
                      star <= rating ? "text-yellow-400" : "text-gray-300"
                    }`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("dialogs.rating.review_label")}</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="w-full mt-2 p-2 border rounded-md"
                rows={3}
                placeholder={t("dialogs.rating.review_placeholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRatingDialog(false)}>
              {t("dialogs.rating.cancel")}
            </Button>
            <Button onClick={submitRating} disabled={rating === 0}>
              {t("dialogs.rating.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}