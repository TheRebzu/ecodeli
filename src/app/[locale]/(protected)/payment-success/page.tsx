"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircleIcon,
  CreditCardIcon,
  ArrowLeftIcon,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PaymentSuccessPage() {
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<
    "success" | "processing" | "error"
  >("processing");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const paymentIntent = searchParams.get("payment_intent");
  const redirectStatus = searchParams.get("redirect_status");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        if (!paymentIntent) {
          setPaymentStatus("error");
          setLoading(false);
          return;
        }

        // Vérifier le statut du paiement
        if (redirectStatus === "succeeded") {
          // Récupérer les détails du Payment Intent pour trouver le bookingId
          const response = await fetch("/api/payments/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntent,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setBookingId(data.bookingId);
            setPaymentStatus("success");

            toast({
              title: "Payment Successful! 🎉",
              description:
                "Your booking has been confirmed and payment processed.",
              duration: 5000,
            });
          } else {
            setPaymentStatus("error");
          }
        } else {
          setPaymentStatus("error");
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        setPaymentStatus("error");
        toast({
          title: "Verification Error",
          description:
            "Unable to verify payment status. Please contact support.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [paymentIntent, redirectStatus, toast]);

  const handleGoToBooking = () => {
    if (bookingId) {
      router.push(`/client/bookings/${bookingId}`);
    } else {
      router.push("/client/bookings");
    }
  };

  const handleGoToBookings = () => {
    router.push("/client/bookings");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">
                Verifying Payment...
              </h2>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === "success") {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div>
              <p className="text-lg mb-2">
                🎉 Your booking has been confirmed!
              </p>
              <p className="text-muted-foreground">
                Payment has been successfully processed and your service
                provider has been notified.
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CreditCardIcon className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-600">
                  Payment Details
                </span>
              </div>
              <p className="text-sm text-green-700">
                <strong>Payment ID:</strong> {paymentIntent}
              </p>
              <p className="text-sm text-green-700">
                <strong>Status:</strong> Completed
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">What happens next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>
                  ✅ Your service provider will prepare for the appointment
                </li>
                <li>✅ You'll receive a confirmation email with details</li>
                <li>✅ You can track your booking status in your dashboard</li>
                <li>✅ You'll be notified before the scheduled service</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {bookingId && (
                <Button onClick={handleGoToBooking} className="flex-1">
                  View Booking Details
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleGoToBookings}
                className="flex-1"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                All Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <CreditCardIcon className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Payment Issue</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div>
            <p className="text-lg mb-2">There was an issue with your payment</p>
            <p className="text-muted-foreground">
              We couldn't verify your payment status. Please check your bookings
              or contact support.
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-700">
              If you believe this is an error, please contact our support team
              with your payment reference.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button onClick={handleGoToBookings} className="flex-1">
              Check My Bookings
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/support")}
              className="flex-1"
            >
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
