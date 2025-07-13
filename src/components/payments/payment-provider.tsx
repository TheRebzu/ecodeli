"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentForm } from "./payment-form";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface PaymentProviderProps {
  clientSecret: string;
  amount: number;
  currency: string;
  description: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PaymentProvider({
  clientSecret,
  amount,
  currency,
  description,
  onSuccess,
  onError,
}: PaymentProviderProps) {
  const options = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#0ea5e9",
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#ef4444",
        fontFamily: "Inter, system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "8px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        amount={amount}
        currency={currency}
        description={description}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
