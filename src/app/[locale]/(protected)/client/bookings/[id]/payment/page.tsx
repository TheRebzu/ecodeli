'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  CalendarIcon, 
  ClockIcon, 
  CreditCardIcon,
  CheckIcon,
  AlertCircleIcon,
  ArrowLeftIcon
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/use-toast'
import { PaymentForm } from '@/components/payments/payment-form'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'

// Initialiser Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BookingPayment {
  id: string
  status: string
  scheduledAt: string
  totalPrice: number
  service: {
    name: string
    description: string
    duration: number
    price: number
    provider: {
      user: {
        profile: {
          firstName: string
          lastName: string
        }
      }
    }
  }
  payment?: {
    id: string
    status: string
    amount: number
  }
}

export default function BookingPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('client.bookings')
  const { toast } = useToast()
  const [booking, setBooking] = useState<BookingPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const bookingId = params.id as string

  useEffect(() => {
    fetchBookingDetails()
  }, [bookingId])

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch booking')
      }
      const data = await response.json()
      setBooking(data)
      
      // Si le booking est confirmé, créer le Payment Intent
      if (data.status === 'CONFIRMED') {
        await createPaymentIntent()
      }
    } catch (error) {
      console.error('Error fetching booking:', error)
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const createPaymentIntent = async () => {
    try {
      const response = await fetch(`/api/client/bookings/${bookingId}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }
      
      const data = await response.json()
      setClientSecret(data.clientSecret)
    } catch (error) {
      console.error('Error creating payment intent:', error)
      toast({
        title: "Payment Setup Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      setPaymentLoading(true)
      
      // Update booking status to paid/in progress
      const response = await fetch(`/api/client/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          paymentId: paymentData.paymentId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update booking status')
      }

      toast({
        title: "Payment Successful! 🎉",
        description: "Your booking has been paid and confirmed. The provider will contact you soon."
      })

      // Redirect to booking details
      router.push(`/client/bookings/${bookingId}`)

    } catch (error) {
      console.error('Error updating booking after payment:', error)
      toast({
        title: "Warning",
        description: "Payment was processed but booking status update failed. Please contact support.",
        variant: "destructive"
      })
    } finally {
      setPaymentLoading(false)
    }
  }

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error)
    toast({
      title: "Payment Failed",
      description: "There was an issue processing your payment. Please try again.",
      variant: "destructive"
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'CONFIRMED': { color: 'bg-green-100 text-green-800', text: 'Confirmed - Payment Required' },
      'IN_PROGRESS': { color: 'bg-blue-100 text-blue-800', text: 'In Progress' },
      'COMPLETED': { color: 'bg-gray-100 text-gray-800', text: 'Completed' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Booking Not Found</h3>
              <p className="text-muted-foreground">The requested booking could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If booking is not confirmed, redirect to booking details
  if (booking.status !== 'CONFIRMED') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payment Not Required</h3>
              <p className="text-muted-foreground mb-4">
                This booking is not ready for payment or has already been paid.
              </p>
              <Button onClick={() => router.push(`/client/bookings/${bookingId}`)}>
                View Booking Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/client/bookings/${bookingId}`)}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Booking
        </Button>
        <h1 className="text-3xl font-bold">Complete Your Payment</h1>
        <p className="text-muted-foreground mt-2">
          Your booking has been accepted by the provider. Complete payment to finalize your booking.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Booking Summary
              {getStatusBadge(booking.status)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{booking.service.name}</h3>
              <p className="text-muted-foreground">{booking.service.description}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(booking.scheduledAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(booking.scheduledAt).toLocaleTimeString()} 
                  ({booking.service.duration} minutes)
                </span>
              </div>
            </div>

            <Separator />

            {/* Provider Info */}
            <div>
              <h4 className="font-semibold mb-2">Provider</h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {booking.service.provider.user.profile.firstName?.[0]}
                    {booking.service.provider.user.profile.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {booking.service.provider.user.profile.firstName} {booking.service.provider.user.profile.lastName}
                </span>
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Service Price</span>
                <span>€{booking.service.price}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total Amount</span>
                <span>€{booking.totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientSecret ? (
              <Elements 
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#16a34a',
                    }
                  }
                }}
              >
                <PaymentForm
                  amount={booking.totalPrice}
                  currency="EUR"
                  description={`Payment for ${booking.service.name}`}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2">Initializing payment...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckIcon className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Secure Payment</h4>
              <p className="text-sm text-muted-foreground">
                Your payment is processed securely through Stripe. Your card information is encrypted and never stored on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 